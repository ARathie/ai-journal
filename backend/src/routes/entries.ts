import express from 'express';
import { concatenateAudioFiles } from '../utils/ffmpeg';
import { transcribeAudio, summarizeContent, analyzeContent } from '../utils/openai';
import { getAudioUrl } from '../utils/s3';
import { uploadToS3 } from '../utils/s3';
import { upload } from '../utils/multer';
import { prisma, ensureJournalEntry } from '../utils/db';
import { embedAndStoreEntry, queryJournal } from '../utils/embeddings';
import openai from '../utils/openai';

console.log('Entries router loaded');

const router = express.Router();

// Add middleware to log all requests
router.use((req, res, next) => {
  console.log('Request received:', {
    method: req.method,
    path: req.path,
    query: req.query
  });
  next();
});

// Add this near the top, right after creating the router
router.use((req, res, next) => {
  console.log('Request details:', {
    method: req.method,
    path: req.path,
    params: req.params,
    baseUrl: req.baseUrl,
    originalUrl: req.originalUrl,
    route: req.route
  });
  next();
});

interface Match {
    metadata: {
        entry_id: string;
        chunk_index: number;
    };
}

interface QueryParams {
  page?: string;
  limit?: string;
  startDate?: string;
  endDate?: string;
  userId: string;  // Will come from auth middleware
}

router.get('/list-test', async (req, res) => {
  console.log('Hit /list-test route');
  res.json({ 
    message: 'List endpoint hit correctly',
    entries: [],
    hasMore: false,
    nextCursor: null
  });
});

router.get('/list', async (req, res) => {
  console.log('Hit /list route');
  try {
    console.log('Received request for entries list');
    const {
      limit = '20',
      cursor,
    } = req.query as { limit?: string; cursor?: string };

    console.log('Query params:', { limit, cursor });

    // TODO: Get userId from auth middleware
    const userId = 'test-user'; // Temporary! Remove when auth is implemented

    // Add this debug log
    const entriesCount = await prisma.journalEntry.count();
    console.log('Total entries in database:', entriesCount);

    // Build where clause
    const where = {
      userId,
      ...(cursor ? {
        createdAt: {
          lt: new Date(cursor) // Get items created before the cursor
        }
      } : {})
    };

    // Get entries
    const entries = await prisma.journalEntry.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      },
      take: parseInt(limit) + 1, // Take one extra to know if there are more
      select: {
        id: true,
        title: true,
        content: true,
        createdAt: true,
        keyPoints: true,
        sentiment: true,
        emotionTags: true,
        topicTags: true
      }
    });
    
    // Check if there are more entries
    const hasMore = entries.length > parseInt(limit);
    const items = hasMore ? entries.slice(0, -1) : entries;
    const nextCursor = hasMore ? entries[entries.length - 2].createdAt.toISOString() : undefined;
    
    console.log('Sending response:', {
      entriesCount: items.length,
      hasMore,
      nextCursor
    });
    
    res.json({
      entries: items,
      nextCursor,
      hasMore
    });

  } catch (error) {
    console.error('Error fetching entries:', error);
    res.status(500).json({ 
      error: 'Failed to fetch entries',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/:entryId', async (req, res) => {
  console.log('Hit /:entryId route with:', req.params.entryId);
  try {
    const { entryId } = req.params;
    
    // Only handle actual entry IDs (e.g., UUIDs or numbers)
    if (entryId === 'list' || entryId === 'list-test') {
      return res.status(404).json({ error: 'Route not found' });
    }
    
    // Here you would fetch entry details from your database
    const entry = await prisma.journalEntry.findUnique({
      where: { id: entryId }
    });

    if (!entry) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    res.json(entry);
  } catch (error) {
    console.error('Error fetching entry:', error);
    res.status(500).json({ 
      error: 'Failed to fetch entry',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.post('/:entryId/concatenate', async (req, res) => {
  try {
    const { fileKeys } = req.body;
    const { entryId } = req.params;

    if (!fileKeys || fileKeys.length === 0) {
      return res.json({ 
        success: true,
        mergedFileKey: null,
        message: 'No audio files to concatenate'
      });
    }

    if (!Array.isArray(fileKeys)) {
      return res.status(400).json({ 
        error: 'Invalid request',
        details: 'fileKeys must be an array'
      });
    }

    console.log('Concatenating files for entry:', entryId, 'Files:', fileKeys);

    const mergedFileKey = await concatenateAudioFiles(fileKeys, entryId);
    
    res.json({ 
      success: true,
      mergedFileKey,
      message: 'Audio files concatenated successfully'
    });
  } catch (error) {
    console.error('Concatenation error:', error);
    res.status(500).json({ 
      error: 'Failed to concatenate audio files',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.post('/:entryId', async (req, res) => {
  try {
    const { entryId } = req.params;
    const { content, title } = req.body;

    // Get or create the entry
    let entry = await ensureJournalEntry(entryId);

    // Update if it already existed
    if (entry.content !== content || entry.title !== title) {
      // Generate all metadata at once
      const [analysis, keyPoints] = await Promise.all([
        analyzeContent(content),
        summarizeContent(content)
      ]);

      // Update entry with all metadata
      entry = await prisma.journalEntry.update({
        where: { id: entryId },
        data: { 
          content,
          title,
          sentiment: String(analysis.sentiment),
          emotionTags: analysis.emotionTags,
          topicTags: analysis.topicTags,
          namedEntities: analysis.namedEntities,
          keyPoints,
          updatedAt: new Date()
        }
      });

      // After updating content and metadata, store embeddings and chunks
      await embedAndStoreEntry(entry.id, content);
    }

    res.json({
      success: true,
      entry,
      message: 'Journal entry updated and analyzed successfully'
    });

  } catch (error) {
    console.error('Update entry error:', error);
    res.status(500).json({ 
      error: 'Failed to update journal entry',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// For voice recordings, update the content which will trigger metadata generation
router.post('/:entryId/record-chunk', upload.single('audio'), async (req, res) => {
  try {
    const { entryId } = req.params;
    const { title } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    // Ensure journal entry exists
    const journalEntry = await ensureJournalEntry(entryId);

    // Upload audio to S3
    const audioKey = await uploadToS3(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      entryId
    );

    // Transcribe the audio
    const transcript = await transcribeAudio(
      req.file.buffer,
      req.file.originalname
    );

    // Get the next chunk order number
    const lastChunk = await prisma.audioChunk.findFirst({
      where: { entryId },
      orderBy: { chunkOrder: 'desc' }
    });
    const nextOrder = (lastChunk?.chunkOrder ?? -1) + 1;

    // Store in AudioChunk
    const audioChunk = await prisma.audioChunk.create({
      data: {
        entryId: journalEntry.id,
        chunkOrder: nextOrder,
        audioChunkUrl: audioKey,
        transcript,
        createdAt: new Date()
      }
    });

    // Generate all metadata at once
    const [analysis, keyPoints] = await Promise.all([
      analyzeContent(transcript),
      summarizeContent(transcript)
    ]);

    // Update the journal entry with content and all metadata
    const entry = await prisma.journalEntry.update({
      where: { id: entryId },
      data: { 
        content: transcript,
        title,
        sentiment: String(analysis.sentiment),
        emotionTags: analysis.emotionTags,
        topicTags: analysis.topicTags,
        namedEntities: analysis.namedEntities,
        keyPoints,
        updatedAt: new Date()
      }
    });

    // Store embeddings and chunks
    await embedAndStoreEntry(entry.id, transcript);

    res.json({
      success: true,
      audioChunkId: audioChunk.id,
      audioKey,
      transcript,
      chunkOrder: nextOrder,
      entry,
      message: 'Audio uploaded, transcribed, and analyzed successfully'
    });

  } catch (error) {
    console.error('Record chunk error:', error);
    res.status(500).json({ 
      error: 'Failed to process audio chunk',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.post('/:entryId/summarize', async (req, res) => {
  try {
    const { entryId } = req.params;

    // Ensure entry exists
    const entry = await ensureJournalEntry(entryId);

    if (!entry.content) {
      return res.status(400).json({ error: 'No content to summarize' });
    }

    // Generate summary
    const keyPoints = await summarizeContent(entry.content);

    // Update the entry
    const updatedEntry = await prisma.journalEntry.update({
      where: { id: entryId },
      data: {
        keyPoints,
        updatedAt: new Date()
      }
    });

    res.json({
      success: true,
      entry: updatedEntry,
      message: 'Journal entry summarized successfully'
    });

  } catch (error) {
    console.error('Summarization error:', error);
    res.status(500).json({ 
      error: 'Failed to summarize journal entry',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// New Q&A route
router.post('/search/qna', async (req, res) => {
  try {
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    // Get relevant chunks from Pinecone
    const matches = await queryJournal(question);

    // Fetch full chunks from database with their entry dates
    const chunks = await Promise.all(
      matches.map((match: Match) => 
        prisma.journalChunk.findFirst({
          where: {
            entry_id: match.metadata.entry_id,
            chunk_index: match.metadata.chunk_index
          },
          include: {
            journalEntry: {
              select: {
                createdAt: true
              }
            }
          }
        })
      )
    );

    // Build context with dates
    const context = chunks
      .filter(Boolean)
      .map(chunk => {
        const date = chunk?.journalEntry?.createdAt.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        return `[Entry from ${date}]:\n${chunk?.chunk_text}`;
      })
      .join('\n\n');

    // Generate answer using GPT-4
    const completion = await openai.chat.completions.create({
      model: process.env.GPT_MODEL || 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant answering questions about my journal entries. Use the provided context to answer questions accurately and concisely. Frame your responses in a personal way, as you are helping me understand my own journal entries. Always reference the dates of the entries you are drawing information from, especially when discussing events, feelings, or changes over time.'
        },
        {
          role: 'user',
          content: `Context from my journal entries:\n${context}\n\nQuestion: ${question}`
        }
      ]
    });

    res.json({
      answer: completion.choices[0].message.content,
      context: matches.map((match: { metadata: any }) => match.metadata)
    });

  } catch (error) {
    console.error('Q&A error:', error);
    res.status(500).json({ 
      error: 'Failed to process question',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/debug-route', async (req, res) => {
  console.log('Hit debug route');
  res.json({ 
    message: 'Debug route hit correctly',
    timestamp: new Date().toISOString()
  });
});

export default router; 