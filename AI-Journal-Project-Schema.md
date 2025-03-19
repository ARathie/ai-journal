┌─────────────────────────┐
│   React Native App      │
│  (iOS & Android)        │
│  - Record Audio         │
│  - Display Transcript   │
│  - Summaries & Q&A      │
└──────────────┬──────────┘
               │
     REST/HTTPS│API Calls
               ▼
┌─────────────────────────┐
│  Server (Fly.io/Render) │
│  - Node/Python/etc.     │
│  - FFmpeg for           │
│    audio concat         │
│  - LLM calling logic    │
│  - DB access (Postgres) │
└──────────────┬──────────┘
               │
               ▼
┌─────────────────────────┐    ┌──────────────────────┐
│  Postgres Database      │    │   Object Storage     │
│  - Users                │    │ (S3 or equivalent)   │
│  - Journal Entries      │    │ - Audio Chunk Files  │
│  - Metadata             │    │ - Final Merged Audio │
└──────────────┬──────────┘    └──────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Pinecone (Vector DB for Embeddings)   │
│  - Stores (entry_id, chunk_id, embedding, metadata) 
│  - Semantic Search for Q&A             │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  External AI Services                                  │
│  1. OpenAI Whisper API (Speech-to-Text)                │
│  2. OpenAI GPT-4o (Summaries & Q&A)                     │
└─────────────────────────────────────────────────────────┘




**Key Points:**
1. **React Native** for iOS/Android.
2. **Single Server** on Fly.io or Render for API + FFmpeg.
3. **Postgres** as main DB for users/journal data.
4. **Object Storage** for audio.
5. **Pinecone** for vector embeddings (semantic Q&A).
6. **OpenAI APIs** for transcription (Whisper) and GPT-4 for summaries/Q&A.

---

## 2. Data Model

### 2.1 Users Table

| Field           | Type      | Description                                               |
|-----------------|-----------|-----------------------------------------------------------|
| `user_id`       | UUID (PK) | Unique identifier for each user.                         |
| `email`         | String    | User’s login email (if using your own auth).             |
| `password_hash` | String    | Hashed password (if storing credentials).                |
| `created_at`    | Timestamp | When the user record was created.                        |
| `updated_at`    | Timestamp | Last time the user record was updated.                   |

---

### 2.2 Journal Entries Table

| Field              | Type             | Description                                                                                 |
|--------------------|------------------|---------------------------------------------------------------------------------------------|
| `entry_id`         | UUID (PK)        | Unique ID for each journal entry.                                                           |
| `user_id`          | UUID (FK)        | References `users.user_id`; indicates who owns the entry.                                   |
| `title`            | String           | Optional short title of the journal entry.                                                 |
| `content`          | Text             | The full text of the journal entry (transcribed + typed).                                  |
| `created_at`       | Timestamp        | Date/time the entry was initially created.                                                 |
| `updated_at`       | Timestamp        | Date/time the entry was last modified.                                                     |
| `final_audio_url`  | String (URL)     | Pointer to concatenated final audio file.                                                  |
| `sentiment`        | String or Float  | Overall sentiment label or numeric score (e.g. "positive", 0.75).                          |
| `emotion_tags`     | JSON/Array       | List of emotions detected (e.g., `["joy", "sadness"]`).                                    |
| `topic_tags`       | JSON/Array       | Broad topics (e.g., `["work", "family"]`).                                                 |
| `named_entities`   | JSON/Array       | People, places, organizations, etc.                                                        |
| `key_points`       | JSON/Array       | A short list of bullet points or highlights.                                               |

---

### 2.3 Audio Chunks Table (Optional)

| Field             | Type             | Description                                                      |
|-------------------|------------------|------------------------------------------------------------------|
| `chunk_id`        | UUID (PK)        | Unique ID for each audio chunk.                                 |
| `entry_id`        | UUID (FK)        | References `journal_entries.entry_id`.                           |
| `chunk_order`     | Integer          | Sequence/order for concatenation.                               |
| `audio_chunk_url` | String (URL)     | File location in object storage.                                 |
| `transcript`      | Text             | Transcript of the chunk (optional if stored directly in entry).  |
| `created_at`      | Timestamp        | When the chunk was created/uploaded.                            |

---

## 3. AI & Metadata Flow

### 3.1 Voice Dictation Workflow

1. **Record Short Clip**  
   - User taps “Record” in React Native → stops → uploads to S3.

2. **Transcription**  
   - Server calls OpenAI Whisper with the audio clip URL → Whisper returns transcript → appended to entry `content`.

3. **Multiple Chunks**  
   - Repeat as needed for iterative dictation. Each chunk is stored with `chunk_order`.

4. **Concatenation**  
   - On finalize, server uses FFmpeg to merge all chunks → uploads final audio to S3 → updates `final_audio_url`.

---

### 3.2 Summaries

1. **Prompt GPT-4** with the entry’s `content` for a short summary.  
2. **Store** the summary in `key_points` or an additional field.

---

### 3.3 Embeddings & Q&A

1. **Chunking for Embeddings**: Break `content` into ~500-token segments.  
2. **Generate Embeddings**: Using OpenAI embedding model (e.g. `text-embedding-ada-002`).  
3. **Upsert to Pinecone**: Each chunk gets metadata (`entry_id`, etc.).  
4. **User Q&A**:  
   - User question → embed question → query Pinecone → retrieve top-N relevant chunks → GPT-4 with question + chunks → final answer returned.

---

### 3.4 Metadata Extraction

1. **LLM/NLP**: Sentiment, emotion tags, topic tags, named entities, key points.  
2. **Store** in `journal_entries` as JSON fields.  
3. **Use** for advanced filtering or analytics.

---

## 4. Example API Endpoints

| Method     | Endpoint                           | Description                                                      |
|------------|------------------------------------|------------------------------------------------------------------|
| **POST**   | `/auth/register`                   | User registration (if local auth)                                |
| **POST**   | `/auth/login`                      | User login → returns token/session                               |
| **POST**   | `/entries`                         | Create a new journal entry                                       |
| **GET**    | `/entries/:entry_id`               | Fetch a specific entry (content + metadata)                      |
| **PUT**    | `/entries/:entry_id`               | Update an existing entry                                         |
| **POST**   | `/entries/:entry_id/record-chunk`  | Upload & transcribe a single audio chunk                         |
| **POST**   | `/entries/:entry_id/concatenate`   | Concatenate all chunks → store final audio                       |
| **POST**   | `/entries/:entry_id/summarize`     | Summarize the entry’s content via GPT-4                          |
| **POST**   | `/qna`                             | Global Q&A endpoint (query Pinecone + GPT)                       |

---

## 5. Deployment & DevOps

1. **React Native** for iOS & Android.  
2. **Server** on Fly.io or Render (Node/Python + FFmpeg + API routes).  
3. **Postgres** for primary data (managed instance).  
4. **Object Storage** (S3 or similar) for audio files.  
5. **Pinecone** for vector embeddings.  
6. **OpenAI APIs**: Whisper for STT, GPT-4 for summaries/Q&A.

---

## 6. Future Extensions

- **Offline Support** (cache entries locally).  
- **Calendar Integration** for auto-tagging.  
- **Advanced NLP** or self-hosted LLM.  
- **UI Enhancements** (mood graphs, advanced filters).  
- **Privacy/Encryption** for large-scale multi-user scenarios.

---

## 7. Licensing & Costs

- **Server Hosting**: \$5–\$20/month for a small instance.  
- **Object Storage**: Pay per GB stored (e.g. \$0.023/GB on S3).  
- **OpenAI Whisper/GPT**: Pay per minute (Whisper) + tokens (GPT).  
- **Pinecone**: Usage-based; free tier for small projects.

---

## 8. AI Model Updates

- **Auto-Updates** by OpenAI.  
- **Version Pinning** if needed.  
- **Self-Hosting** option for future scaling/privacy needs.

---

## 9. Conclusion

This schema captures the core architecture and data structures for your **AI-Powered Journaling App**:
- **Voice dictation** with Whisper
- **AI Summaries** via GPT
- **Semantic Q&A** across all entries with embeddings/Pinecone
- **Metadata** (sentiment, topics, etc.) to enrich searches and insights





