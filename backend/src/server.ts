import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import uploadRouter from './routes/upload';
import entriesRouter from './routes/entries';

// Load environment variables
dotenv.config();

// Debug environment variables
console.log('Environment variables loaded:', {
  region: process.env.AWS_REGION,
  accessKeyIdExists: !!process.env.AWS_ACCESS_KEY_ID,
  secretKeyExists: !!process.env.AWS_SECRET_ACCESS_KEY,
  bucketName: process.env.AWS_BUCKET_NAME
});

// Initialize express
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', uploadRouter);
app.use('/api/entries', entriesRouter);

// Basic health check route
app.get('/', (req, res) => {
  res.json({ message: 'Server is running' });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Define port
const PORT = process.env.PORT || 3000;

// Start server
app.listen(PORT, () => {
  console.log(`Server is running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
