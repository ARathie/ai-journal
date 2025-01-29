import express from 'express';
import cors from 'cors';
import uploadRouter from './routes/upload';
import entriesRouter from './routes/entries';

const app = express();

// Debug logging
console.log('Setting up Express app...');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Debug logging for routes
console.log('Registering routes...');
app.use('/api', uploadRouter);
app.use('/api/entries', entriesRouter);
console.log('Routes registered');

// Add a test route to the root
app.get('/', (req, res) => {
  res.json({ message: 'Server is running' });
});

export default app; 