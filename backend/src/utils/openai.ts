import OpenAI from 'openai';
import { createReadStream } from 'fs';
import { writeFileSync } from 'fs';
import { unlinkSync } from 'fs';
import path from 'path';
import os from 'os';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export default openai;

export async function transcribeAudio(buffer: Buffer, filename: string): Promise<string> {
  try {
    // Create a temporary file
    const tempPath = path.join(os.tmpdir(), `temp-${Date.now()}-${filename}`);
    writeFileSync(tempPath, buffer);

    console.log('Starting transcription for file:', filename);
    console.log('OpenAI API Key exists:', !!process.env.OPENAI_API_KEY);
    
    // Create a readable stream from the temp file
    const transcription = await openai.audio.transcriptions.create({
      file: createReadStream(tempPath),
      model: "whisper-1",
    });

    // Clean up temp file
    unlinkSync(tempPath);

    console.log('Transcription successful:', transcription.text);
    return transcription.text;
  } catch (error) {
    console.error('Detailed transcription error:', error);
    throw error;
  }
}

export async function summarizeContent(content: string): Promise<string[]> {
  try {
    const completion = await openai.chat.completions.create({
      model: process.env.GPT_MODEL || 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that summarizes journal entries. Please extract 3-5 key points from the content. Return only the bullet points, one per line, without any additional text or formatting.'
        },
        {
          role: 'user',
          content: content
        }
      ],
      temperature: 0.7,
      max_tokens: parseInt(process.env.MAX_TOKENS || '500'),
    });

    // Split the response into an array of bullet points
    const summary = completion.choices[0].message.content?.split('\n')
      .filter(line => line.trim()) // Remove empty lines
      .map(line => line.replace(/^[•\-\*]\s*/, '')); // Remove bullet characters

    return summary || [];
  } catch (error) {
    console.error('Summarization error:', error);
    throw error;
  }
}

interface MetadataAnalysis {
  sentiment: number;
  emotionTags: string[];
  topicTags: string[];
  namedEntities: string[];
}

export async function analyzeContent(content: string): Promise<MetadataAnalysis> {
  try {
    const completion = await openai.chat.completions.create({
      model: process.env.GPT_MODEL || 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an AI that analyzes journal entries. For the given text, provide:
          1. A sentiment score from -3 (very negative) to +3 (very positive), with 0 being neutral
          2. Emotion tags (e.g., happy, anxious, proud)
          3. Topic tags (e.g., work, technology, relationships)
          4. Named entities (people, places, organizations mentioned)
          
          Return the analysis in this exact JSON format:
          {
            "sentiment": number,
            "emotionTags": string[],
            "topicTags": string[],
            "namedEntities": string[]
          }`
        },
        {
          role: 'user',
          content: content
        }
      ],
      temperature: 0.7,
      max_tokens: parseInt(process.env.MAX_TOKENS || '500'),
      response_format: { type: "json_object" }  // Ensure JSON response
    });

    const analysis = JSON.parse(completion.choices[0].message.content || '{}');
    return {
      sentiment: analysis.sentiment || 0,
      emotionTags: analysis.emotionTags || [],
      topicTags: analysis.topicTags || [],
      namedEntities: analysis.namedEntities || []
    };
  } catch (error) {
    console.error('Analysis error:', error);
    throw error;
  }
}

interface QAResponse {
  answer: string;
  context: any[];  // Type this better based on your Pinecone metadata
}

export async function generateAnswer(question: string, context: string): Promise<QAResponse> {
  try {
    const completion = await openai.chat.completions.create({
      model: process.env.GPT_MODEL || 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that answers questions about journal entries. Use the provided context to answer questions accurately and concisely.'
        },
        {
          role: 'user',
          content: `Context from journal entries:\n${context}\n\nQuestion: ${question}`
        }
      ],
      temperature: 0.7,
      max_tokens: parseInt(process.env.MAX_TOKENS || '500')
    });

    return {
      answer: completion.choices[0].message.content || '',
      context: []  // This will be filled by the route
    };
  } catch (error) {
    console.error('Answer generation error:', error);
    throw error;
  }
}