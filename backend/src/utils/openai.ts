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