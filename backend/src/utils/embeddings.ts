import { Pinecone } from '@pinecone-database/pinecone';
import openai from './openai';
import dotenv from 'dotenv';
import { prisma } from './db';

dotenv.config();

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!
});

const INDEX_NAME = 'journal-entries';

// Function to ensure index exists
async function ensureIndex() {
  try {
    const indexes = await pinecone.listIndexes();
    
    if (!indexes?.indexes?.some(index => index.name === INDEX_NAME)) {
      console.log('Creating new Pinecone index...');
      
      await pinecone.createIndex({
        name: INDEX_NAME,
        dimension: 1536,  // for text-embedding-3-small
        metric: 'cosine',
        spec: {
          serverless: {
            cloud: 'aws',
            region: 'us-east-1'
          }
        }
      });
      
      console.log('Index created successfully');
    }
  } catch (error) {
    console.error('Error ensuring index exists:', error);
    throw error;
  }
}

// Initialize Pinecone with index
let index: any;

export async function initializePinecone() {
  await ensureIndex();
  index = pinecone.index(INDEX_NAME);
  console.log('Pinecone initialized successfully');
}

// Split text into chunks of ~500 tokens
function splitIntoChunks(text: string, chunkSize: number = 500): { 
  text: string; 
  startOffset: number; 
  endOffset: number; 
}[] {
  const chunks: { text: string; startOffset: number; endOffset: number; }[] = [];
  let startOffset = 0;

  while (startOffset < text.length) {
    const endOffset = Math.min(startOffset + chunkSize * 4, text.length); // Rough char estimate
    chunks.push({
      text: text.slice(startOffset, endOffset),
      startOffset,
      endOffset
    });
    startOffset = endOffset;
  }

  return chunks;
}

export async function embedAndStoreEntry(entryId: string, content: string) {
  if (!index) throw new Error('Pinecone not initialized');
  const chunks = splitIntoChunks(content);
  
  // First, store chunks in the database
  await Promise.all(chunks.map(async (chunk, index) => {
    await prisma.journalChunk.create({
      data: {
        entry_id: entryId,
        chunk_index: index,
        start_offset: chunk.startOffset,
        end_offset: chunk.endOffset,
        snippet: chunk.text.slice(0, 100),
        chunk_text: chunk.text,
      }
    });
  }));
  
  // Then generate embeddings and store in Pinecone
  const embeddingPromises = chunks.map(async (chunk, index) => {
    const embedding = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: chunk.text,
      encoding_format: 'float'
    });

    return {
      id: `${entryId}-chunk-${index}`,
      values: embedding.data[0].embedding,
      metadata: {
        entry_id: entryId,
        chunk_index: index,
        snippet: chunk.text.slice(0, 100),
        start_offset: chunk.startOffset,
        end_offset: chunk.endOffset
      }
    };
  });

  const vectors = await Promise.all(embeddingPromises);
  await index.upsert(vectors);
}

export async function queryJournal(question: string) {
  if (!index) throw new Error('Pinecone not initialized');
  // Generate embedding for the question
  const embedding = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: question,
    encoding_format: 'float'
  });

  // Query Pinecone
  const results = await index.query({
    vector: embedding.data[0].embedding,
    topK: 3,
    includeMetadata: true
  });

  return results.matches;
}