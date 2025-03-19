export interface JournalEntry {
  id: string;
  title: string;
  content: string;
  keyPoints: string[];
  createdAt: string;
  updatedAt: string;
  audioChunks?: AudioChunk[];
}

export interface AudioChunk {
  id: string;
  audioKey: string;
  transcript: string;
  chunkOrder: number;
  createdAt: string;
}
