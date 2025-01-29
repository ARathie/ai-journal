import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export default openai;

export async function transcribeAudio(audioUrl: string): Promise<string> {
  try {
    const transcription = await openai.audio.transcriptions.create({
      file: await fetch(audioUrl).then(res => res.blob()),
      model: "whisper-1",
    });

    return transcription.text;
  } catch (error) {
    console.error('Transcription error:', error);
    throw error;
  }
}