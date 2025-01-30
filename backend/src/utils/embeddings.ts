import { Pinecone } from '@pinecone-database/pinecone';
import openai from './openai';
import dotenv from 'dotenv';

dotenv.config();

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!
});

const INDEX_NAME = 'journal-entries';

// Function to ensure index exists
async function ensureIndex() {
  try {
    const indexList = await pinecone.listIndexes();
    
    // Check if our index exists in the returned list
    if (!indexList?.indexes?.some(index => index.name === INDEX_NAME)) {
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
    throw error;  // Re-throw to handle in app startup
  }
}

// Initialize Pinecone with index
let index: any;  // We'll type this properly once initialized

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
  
  // Generate embeddings for all chunks
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
  
  // Upsert to Pinecone
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