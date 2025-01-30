import express from 'express';
import { concatenateAudioFiles } from '../utils/ffmpeg';
import { transcribeAudio, summarizeContent, analyzeContent } from '../utils/openai';
import { getAudioUrl } from '../utils/s3';
import { uploadToS3 } from '../utils/s3';
import { upload } from '../utils/multer';
import { PrismaClient } from '@prisma/client';
import { prisma, ensureJournalEntry } from '../utils/db';
import { embedAndStoreEntry, queryJournal } from '../utils/embeddings';
import { generateAnswer } from '../utils/openai';

const router = express.Router();
const prismaClient = new PrismaClient();

router.get('/test', (req, res) => {
  res.json({ message: 'Entries router is working' });
});

router.post('/:entryId/concatenate', async (req, res) => {
  try {
    const { fileKeys } = req.body;
    const { entryId } = req.params;  // This should now be a date-based ID

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

// You might also want to add a route to get entry details
router.get('/:entryId', async (req, res) => {
  try {
    const { entryId } = req.params;
    
    // Here you would fetch entry details from your database
    // Including both text content and audio file key (if exists)
    
    res.json({
      id: entryId,
      text: "Sample entry text",
      audioKey: "audio/merged/123.m4a", // null if no audio
      createdAt: new Date(),
      // ... other entry details
    });
  } catch (error) {
    console.error('Error fetching entry:', error);
    res.status(500).json({ 
      error: 'Failed to fetch entry',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.post('/:entryId/record-chunk', upload.single('audio'), async (req, res) => {
  try {
    const { entryId } = req.params;
    
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

    res.json({
      success: true,
      audioChunkId: audioChunk.id,
      audioKey,
      transcript,
      chunkOrder: nextOrder,
      message: 'Audio uploaded and transcribed successfully'
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

// Add this new route for updating journal entry content
router.post('/:entryId', async (req, res) => {
  try {
    const { entryId } = req.params;
    const { content } = req.body;

    // Get or create the entry
    let entry = await ensureJournalEntry(entryId, content);

    // Update if it already existed
    if (entry.content !== content) {
      entry = await prisma.journalEntry.update({
        where: { id: entryId },
        data: { 
          content,
          updatedAt: new Date()
        }
      });
    }

    // Analyze content
    if (content) {
      const analysis = await analyzeContent(content);
      entry = await prisma.journalEntry.update({
        where: { id: entryId },
        data: {
          sentiment: String(analysis.sentiment),
          emotionTags: analysis.emotionTags,
          topicTags: analysis.topicTags,
          namedEntities: analysis.namedEntities,
          updatedAt: new Date()
        }
      });
    }

    // After updating content, store embeddings
    if (content) {
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

// New Q&A route
router.post('/qna', async (req, res) => {
  try {
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    // Get relevant chunks from Pinecone
    const matches = await queryJournal(question);

    // Combine chunks into context
    const context = matches
      .map(match => match.metadata?.snippet)
      .filter(Boolean)
      .join('\n\n');

    // Generate answer
    const response = await generateAnswer(question, context);

    res.json({
      success: true,
      answer: response.answer,
      context: matches.map(m => m.metadata)
    });

  } catch (error) {
    console.error('Q&A error:', error);
    res.status(500).json({ 
      error: 'Failed to process question',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 