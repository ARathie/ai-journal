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