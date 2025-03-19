# AI Journal Project Guidelines

## Build/Lint/Test Commands
- Backend: `cd backend && npm run build` - Compile TypeScript
- Backend: `cd backend && npm run dev` - Development mode with auto-reload
- Frontend: `cd frontend && npm run android` - Build and run Android app
- Frontend: `cd frontend && npm run ios` - Build and run iOS app
- Frontend: `cd frontend && npm run lint` - Run ESLint
- Test: `cd frontend && npx jest -- [test-file-name]` - Run specific test

## Code Style Guidelines
- TypeScript with strict typing (`noImplicitAny: true`) for all new code
- Import organization: React imports first, then libraries, then local files
- Error handling: Use try/catch with specific error types and detailed logging
- Function components with hooks for React components
- Debounced updates for form changes (see JournalEditor pattern)
- File naming: PascalCase for components, camelCase for utilities
- Comment important business logic but not obvious code
- Use Promises and async/await pattern consistently
- Always include proper TypeScript interfaces for data models

## Project Structure
- Frontend: React Native with TypeScript 
- Backend: Express.js with TypeScript and Prisma ORM
- Key features: Journal entries with audio recording and AI analysis