# AI Journal Project Dev Plan

## Initial Prompt
We are building an AI-Powered Journaling App with the following core features:

1. **Voice Dictation** using OpenAI Whisper:
   - The user can record short audio clips, have them automatically transcribed, and store them in a single journal entry.
   - All recorded clips get concatenated into one final audio file at the end for playback.

2. **AI Summaries** using GPT-4:
   - Each journal entry’s text can be summarized into a concise overview.

3. **AI Q&A** across all journal entries using embeddings and Pinecone:
   - The app uses OpenAI embeddings (e.g., text-embedding-ada-002) and Pinecone for semantic search.
   - A user can ask questions about any past entries and get relevant snippets.

4. **React Native Frontend**:
   - Cross-platform mobile app for iOS and Android.
   - Minimalistic UI: list of entries, detail view with voice dictation, Summaries, and Q&A interface.

5. **Server-Side**:
   - Single server, likely Node.js + Express, hosted on Fly.io or Render.
   - Stores data in Postgres.
   - Uses AWS S3 (or equivalent) for audio storage.
   - Uses FFmpeg for audio concatenation.

We want a step-by-step approach. For each step, we’ll write prompts to create or update files, install dependencies, or generate specific code. At the end of each step, we want to verify that the component is functioning correctly.

Our end goal: 
- A working journaling app where we can create entries via voice dictation, auto-transcribe them, get AI summaries, and perform Q&A across the entire journal history.

Now, let’s begin building each piece in an orderly fashion.


## 1. Initialize the Backend Project
### What You’ll Do

Set up a Node.js + Express project.
Configure dependencies and environment structure.

### Prompt to Cursor

Set up a new Node.js + Express project for our AI Journaling App:
1. Initialize package.json and install:
   - express
   - dotenv
   - nodemon (dev dependency)
2. Create server.js that:
   - Loads environment variables from .env
   - Listens on port 3000 (or process.env.PORT)
   - Logs "Server is running" on startup
3. Provide a basic folder structure (e.g., /src, /routes, /controllers).
4. Show me how to run the server with nodemon.

### Completion/Verification Checklist
npm start or nodemon should output: “Server is running” in the terminal.
Visiting http://localhost:3000 (or whichever port you choose) in a browser should return some basic response (like “Hello World” or a minimal JSON response).
If these conditions are met, you can consider this step complete.

## 2. Database & Migrations (Postgres)
### What You’ll Do

Integrate Postgres for user records and journal entries.
Define data models (Users, JournalEntries, AudioChunks) using something like Prisma or Sequelize.
### Prompt to Cursor

Add Postgres support using Prisma migrations:
1. Install Prisma and @prisma/client.
2. Initialize Prisma in this project (npx prisma init).
3. Update prisma.schema with three models:
   - User (user_id, email, password_hash, created_at, updated_at)
   - JournalEntry (entry_id, user_id, content, created_at, updated_at, final_audio_url, sentiment, emotion_tags, topic_tags, named_entities, key_points)
   - AudioChunk (chunk_id, entry_id, chunk_order, audio_chunk_url, transcript, created_at)
4. Generate migrations and show me how to apply them to a local Postgres database.
5. Create a basic /db folder or /prisma folder structure if needed.

### Completion/Verification Checklist
A prisma.schema file should exist with the three models.
Running the migration (npx prisma migrate dev) should create tables in the Postgres DB.
You can verify by connecting to the DB (e.g., with psql or a GUI like TablePlus) to see the tables.
Once these are correct, you’ve laid the foundation for data storage.

## 3. Object Storage (S3 or Equivalent)
### What You’ll Do

Configure AWS S3 (or another object storage) to upload, store, and retrieve audio files.
### Prompt to Cursor

Integrate AWS S3 for audio storage:
1. Install aws-sdk or @aws-sdk/client-s3 (whichever version is recommended).
2. Create a utility file (s3.js) that:
   - Can upload a file to a designated bucket
   - Generates a signed URL for reading or returns the final file URL
3. Show me how to configure AWS credentials via .env
4. Make a simple Express route POST /uploadTest to demonstrate uploading a sample file and returning its S3 URL
### Completion/Verification Checklist
Ensure you can call the /uploadTest endpoint (with a file) and see the file appear in your S3 bucket.
The endpoint should return a URL that, when visited, shows or downloads your newly uploaded file.
If you can confirm the file in S3, this part is complete.

## 4. FFmpeg Concatenation
### What You’ll Do

Merge multiple audio chunk files into one final audio clip using FFmpeg.
### Prompt to Cursor

Implement FFmpeg audio concatenation:
1. Install ffmpeg or fluent-ffmpeg in Node.
2. Write a function that accepts an array of S3 file URLs:
   - Downloads each file or streams them
   - Concatenates them in correct order
   - Outputs a single .mp3 or .m4a file
3. Re-uploads the merged file to S3
4. Create an Express route POST /entries/:entryId/concatenate to demonstrate this flow

### Completion/Verification Checklist
After calling /entries/:entryId/concatenate with multiple chunk URLs:
The final merged audio should appear in S3.
The route returns a final_audio_url.
Playing the file locally or via a link should reveal the combined audio in order.
If the resulting audio is correct, it’s working as expected.

## 5. Speech-to-Text Integration (OpenAI Whisper)
### What You’ll Do

Send audio chunk files to the Whisper API for transcription.
Store the transcript in AudioChunks (or directly appended to JournalEntry content).
### Prompt to Cursor

Integrate OpenAI Whisper for transcription:
1. Install openai or the relevant package
2. Create a route POST /entries/:entryId/record-chunk
   - Accept a file upload or a file URL
   - Upload to S3 if needed
   - Call Whisper’s transcription endpoint
   - Store the transcript in AudioChunks.transcript
3. Return the updated record
4. Show me how we handle any authentication token for Whisper in .env
### Completion/Verification Checklist
Posting an audio file to /entries/:entryId/record-chunk should:
Transcribe the file using Whisper.
Return a JSON response with the recognized transcript.
The database row in AudioChunks is updated with that transcript.
Record a small test clip and see if the transcript is roughly accurate. If so, it’s working.

## 6. LLM Summaries (GPT-4)
### What You’ll Do

Summarize an entry’s content field using GPT-4.
Store the summary in key_points.
### Prompt to Cursor

Add Summaries with GPT-4:
1. Install or configure the openai package for GPT-4 usage
2. Create a route POST /entries/:entryId/summarize
   - Fetch the full text from the JournalEntry.content
   - Send it to GPT-4 with a system prompt: "Please summarize this content in a few sentences or bullet points."
   - Store the output in JournalEntry.key_points
   - Return the updated journal entry
3. Ensure we handle tokens, model selection, etc. from .env
### Completion/Verification Checklist
After calling /entries/:entryId/summarize with a valid entry:
GPT-4 returns a summary.
key_points in the DB is populated (e.g., [ "Short bullet 1", "Short bullet 2" ] or a short paragraph).
The response includes the newly updated entry with the summary.
If you see GPT-4’s summarized text in key_points, you’re good.

## 7. Embedding & Pinecone (Q&A)
### What You’ll Do

Chunk your journal entry text, generate embeddings via OpenAI, store them in Pinecone.
Provide a Q&A endpoint to retrieve relevant chunks and feed them into GPT-4.
### Prompt to Cursor

Integrate Pinecone for semantic search and Q&A:
1. Use text-embedding-ada-002 from OpenAI to embed each chunk (~500 tokens each) of JournalEntry.content
2. Upsert those embeddings to Pinecone with metadata: { entry_id, chunk_index }
3. Create a route POST /qna:
   - Accept { question: string }
   - Embed the question
   - Query Pinecone for top-N matching chunks
   - Combine them with the question in a prompt to GPT-4
   - Return the final answer
4. Show me how to configure Pinecone client keys and index

### Completion/Verification Checklist
Adding or editing a Journal Entry triggers chunk embedding.
POST /qna with a question like “When did I feel happy about family?” returns a GPT-4 answer referencing relevant text.
The answer makes sense and references the user’s actual text from the DB.
If the retrieval returns relevant segments, it’s functioning properly.

## 8. Metadata Extraction (Optional)
### What You’ll Do

Prompt GPT-4 or another model to identify sentiment, topics, etc., storing them in the DB.
### Prompt to Cursor

Implement metadata extraction for JournalEntry:
1. After content is saved or updated, call GPT-4 with a prompt like:
   "Analyze the text: [content]. 
    Provide overall sentiment, emotion_tags, topic_tags, named_entities."
2. Store these in JournalEntry.sentiment, emotion_tags, topic_tags, named_entities
3. Return the updated entry

### Completion/Verification Checklist
When saving or updating an entry, check DB fields. If GPT-4 returns “sentiment: positive, emotion_tags: [‘joy’, ‘gratitude’], ...” those should appear in the DB row.
If you can see the stored data in subsequent queries, it’s working as intended.


## 9. React Native Frontend Setup
### What You’ll Do

Initialize a React Native app (Expo or bare workflow).
Basic screens: list of entries, detail view, record button, summarize button, Q&A input.
### Prompt to Cursor

Initialize a new React Native project using Expo:
1. Set up React Navigation for two screens: Home (list of entries) and EntryDetail
2. On Home screen, fetch a list of journal entries from GET /entries
3. On EntryDetail screen, show the entry text, a record button, a "Summarize" button, and a "Ask AI" field
4. Provide a .env or config for the server's base URL
5. Show me how to run this on iOS/Android simulators

### Completion/Verification Checklist
You can run expo start and see two screens.
The Home screen shows entries from the backend.
Tapping an entry navigates to detail screen with placeholders for Summaries, Q&A, etc.


## 10. Audio Recording in React Native
### What You’ll Do

Integrate a library like react-native-audio-recorder-player.
Let the user record short chunks, upload them to your server, see the transcript.
### Prompt to Cursor

Add voice recording to EntryDetailScreen:
1. Use react-native-audio-recorder-player to start/stop recording
2. On stop, upload the file to /entries/:entryId/record-chunk
3. Display the returned transcript
4. Ensure you handle permissions for microphone on iOS & Android
### Completion/Verification Checklist
Tapping “Record” then “Stop” leads to a call to your server.
The response includes the recognized transcript, which appears in the UI.
The chunk’s audio is in S3, and you can confirm in your DB that the transcript is stored.


## 11. Concatenation & Final Audio Playback
### What You’ll Do

Add a “Finalize Entry” button to call the concatenation route.
Once done, the final audio URL is returned. Provide a player to listen.
### Prompt to Cursor

Implement finalize and playback in EntryDetailScreen:
1. Add a "Finalize Entry" button that calls POST /entries/:entryId/concatenate
2. The server returns final_audio_url
3. Show a "Play Final Audio" button using react-native-audio-recorder-player
4. Ensure the playback speed control is possible if the library supports it

### Completion/Verification Checklist
After tapping “Finalize Entry,” the server merges chunks, updates final_audio_url, and returns it.
You can tap “Play Final Audio” to hear the entire recording.
Speed control might be a property you set on the player (e.g., playbackRate or setRate()).


## 12. Q&A UI and Summaries
### What You’ll Do

Add buttons/UI for Summaries and Q&A.
Summaries: just a “Summarize” button.
Q&A: a text input for user queries.
### Prompt to Cursor

Enhance the EntryDetailScreen for Summaries and Q&A:
1. Add a "Summarize" button that calls POST /entries/:entryId/summarize
2. Display the summary (journalEntry.key_points) in the UI
3. Add a text input labeled "Ask AI"
4. On submit, call POST /qna with the user’s question
5. Display the answer in the UI
6. Provide any loading states or error handling

### Completion/Verification Checklist
Tapping “Summarize” populates a summary in the UI.
Asking a question returns an answer referencing your actual journal data.
The user sees some final text like “It seems you felt happy about your trip last Monday” if relevant.

## 13. Deployment & Environment

### What You’ll Do

Create Dockerfiles or use platform-specific builds.
Deploy to Fly.io or Render.
For the mobile app, use Expo build or local builds to create release versions.
### Prompt to Cursor

Provide deployment configuration for:
1. Dockerfile for the Node.js server
2. Steps to deploy to Fly.io (flyctl commands)
3. Environment variable usage in production
4. Building the React Native app for iOS & Android (Expo build instructions)
5. Summarize any environment variables (OPENAI_API_KEY, PINECONE_API_KEY, DB_URL, etc.) 

### Completion/Verification Checklist
You can run flyctl deploy (or the Render equivalent) to spin up your backend.
The environment variables are set in your hosting platform.
The React Native app can be built via expo build:ios or expo build:android, or you can generate separate iOS/Android builds.



# In-depth Frontend Development Plan 
## 1. Set Up Tab Navigation with Four Tabs
### Prompt to Cursor

Initialize a bottom tab navigator in React Native:
1. Use createBottomTabNavigator from @react-navigation/bottom-tabs (or equivalent).
2. Create four tabs: Journal, Calendar, Trends, Account.
   - Calendar, Trends, Account can be placeholders for now (just simple text).
3. Implement a custom tab bar so we have a “+” button in the center for "New Entry."
   - Tapping this “+” button should open a "New Entry" screen (we’ll define it soon).
4. Make sure the Journal tab is the default initial route.
5. Return me the code for App.js (or MainNavigator.js) showing how these tabs are set up.
### Verification
Four tabs: Journal (default), Calendar, Trends, Account.
A + button in the center opens the new entry screen.


## 2. Build the Journal Tab Screen (List of Entries)
### Prompt to Cursor

In the JournalTab screen:
1. Create a search bar at the top (placeholder text: "Search or Ask your entries with AI").
2. Render a FlatList of journal entries in reverse chronological order.
   - Each list item shows:
     * Title (large font)
     * Date + truncated key_points below (like iOS Notes style).
   - On press, navigate to JournalDetailScreen(entryId).
3. Style it simply, like iOS Notes. 
4. Return me the code for JournalTab.js with these features.
### Verification
Search bar at the top.
List of entries with title, date, truncated key points.
Tapping an item opens the detail screen.

## 3. Create the Detail View Screen + New Entry Screen
### Description
These two screens look very similar. The user can view an existing entry (Detail) or create a new one. Both screens have:

A search bar at the top: “Ask AI about this journal entry”
Title field
Date field (editable via date picker)
A collapsible summary section (for key points)
An audio player with no record button—only playback controls (play, pause, speed, scrub)
A text entry area for the main journal content
A bottom bar with four icons:
Microphone (active),
Image (greyed out),
Photo (greyed out),
Location (greyed out).
When the user taps the microphone icon, it triggers dictation—the result gets inserted into the text at the cursor. The new audio chunk is then appended chronologically to the audio component.

### Prompt to Cursor

Create two screens:
1) JournalDetailScreen
2) NewEntryScreen

They share similar UI:
- A top search bar labeled "Ask AI about this journal entry".
- A TextInput for Title.
- A Date field with a button that opens a date picker.
- A collapsible Summary section (placeholder for now).
- An audio player that only has playback controls (play, pause, speed, scrub).
  * No record button here, just the timeline or current time display.
- A multi-line TextInput for the main journal content.
- A bottom bar with four icons: [Mic], [Image-Greyed], [Photo-Greyed], [Location-Greyed].
   * Tapping Mic triggers a dictation flow (modal or bottom sheet).
   * On stop, the new transcript is inserted at the cursor in the text area
   * The new audio chunk is appended in chronological order to the audio player’s list.

Ensure that if the user is editing an existing entry (JournalDetailScreen), it pre-populates with existing data. If new, it’s blank.

Return me the code for both screens with these elements in place.

### Verification
Detail and New Entry screens have identical layouts except one is pre-filled vs. blank.
Audio player has only playback controls. No record button.
The bottom icons row: mic is active, the others are greyed out.


## 4. Implement the Search/AI Logic UI (Global + Local)
Description
Journal Tab: Search bar at the top for global searching/Q&A across all entries.
Detail View: Same top search bar for local entry Q&A.
Suggestion cards: Appear under the search bar when the user taps it.
Mock the results for now until hooking up the AI pipeline.
### Prompt to Cursor

Enhance the search bars for global and local Q&A:
1) In JournalTab: 
   - If the user enters text, show a mock list of “search results” 
     (chunk snippet, date, clickable).
   - Clicking a result navigates to that entry detail screen (mock data).
2) In JournalDetailScreen:
   - Under the search bar, show 3 suggestion cards if the user taps on the search bar.
   - Tapping a card sets the search bar value and triggers a mock "AI answer" display.
   - That answer could be displayed in a small area or card below the search bar, 
     along with new suggested questions.
3) Return me the updated code with these placeholder search results and suggestion cards.

### Verification
Tapping the search bar in JournalTab shows a mock results panel referencing multiple entries.
Tapping a result navigates to the detail.
The detail screen has a small suggestion feature for entry-specific Q&A.


## 5. Dictation Flow with Single Button
### Description
We now finalize the dictation logic. The microphone icon is placed above the keyboard on the bottom bar. When tapped, it opens a recording modal that supports pause/resume/stop. On stopping, we:

Insert the transcript at the current cursor position in the text area.
Append a new audio file to the audio player's track list in chronological order.
### Prompt to Cursor

Implement dictation with a single microphone button in the bottom bar:
1) On tap, open a record modal (or bottom sheet).
2) Let user Record -> Pause -> Resume -> Stop.
3) When stopping:
   - Insert the transcribed text where the cursor is in the journal content text field
   - Create a new audio chunk in the audio player's list, appended last (chronological order)
4) Return the updated detail/new entry screen code focusing on the mic button and record modal logic.

### Verification
One record button in the bottom icon row.
Pausing/resuming is possible.
Stopping places text in the correct spot and appends a new audio chunk.


## 6. Finalize Navigation & Data Flow
### Description
Now that we have all pieces:

The + button from the tab bar opens NewEntryScreen.
Tapping an item in the Journal list opens the JournalDetailScreen.
Searching in JournalTab simulates a global Q&A.
The detail screen uses a local search bar for local Q&A.
Dictation is done only from the mic icon in the bottom row.

### Prompt to Cursor

Wrap up the navigation and data flow:
1) Confirm the “+” tab button opens NewEntryScreen (blank).
2) Journal list items open JournalDetailScreen with an entryId param.
3) The local search bar in Detail and the global search bar in JournalTab are fully functional for mock queries.
4) The single microphone dictation logic is consistent across detail/new entry screens.
Return me the final updated code with these completed flows.

### Verification
All screens transition correctly.
Dictation works from the single mic button.
Audio playback is separate from recording.
