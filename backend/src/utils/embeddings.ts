import { Pinecone } from '@pinecone-database/pinecone';
import openai from './openai';
import dotenv from 'dotenv';

dotenv.config();

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
  environment: process.env.PINECONE_ENVIRONMENT!
});

const index = pinecone.index(process.env.PINECONE_INDEX!);

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