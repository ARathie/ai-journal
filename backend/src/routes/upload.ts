import express from 'express';
import multer from 'multer';
import AWS from 'aws-sdk';
import path from 'path';
import { uploadToS3 } from '../utils/s3';

const router = express.Router();

// Define allowed file types
const ALLOWED_TYPES = [
  'audio/mpeg',
  'audio/wav', 
  'audio/m4a',
  'audio/mp4',
  'audio/x-m4a',
  'audio/aac'
];

// Define allowed extensions
const ALLOWED_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.mp4', '.aac'];

// Configure multer with file filter
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    console.log('Received file:', {
      originalname: file.originalname,
      mimetype: file.mimetype
    });
    
    const ext = path.extname(file.originalname).toLowerCase();
    // Check both extension AND mime type if it's not octet-stream
    if (ALLOWED_EXTENSIONS.includes(ext)) {
      if (file.mimetype === 'application/octet-stream' || ALLOWED_TYPES.includes(file.mimetype)) {
        cb(null, true);
        return;
      }
    }
    cb(new Error(`Invalid file type. Allowed extensions: ${ALLOWED_EXTENSIONS.join(', ')}`));
  },
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

// Configure AWS SDK with Signature Version 4
const s3 = new AWS.S3({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  signatureVersion: 'v4'
});

// Test AWS connection
router.get('/test-aws', async (req, res) => {
  try {
    console.log('Testing AWS credentials...');
    const buckets = await s3.listBuckets().promise();
    res.json({
      success: true,
      buckets: buckets.Buckets?.map(b => b.Name)
    });
  } catch (error) {
    console.error('AWS Test Error:', error);
    res.status(500).json({
      error: 'AWS Test Failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get signed URL
router.get('/test-file/:key(*)', async (req, res) => {
  try {
    console.log('Getting signed URL for:', req.params.key);
    
    const url = s3.getSignedUrlPromise('getObject', {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: req.params.key,
      Expires: 3600 // 1 hour
    });

    console.log('Generated URL:', url);
    res.json({ signedUrl: await url });
  } catch (error) {
    console.error('Error getting signed URL:', error);
    res.status(500).json({ 
      error: 'Failed to get signed URL',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Upload file with organized structure
router.post('/uploadTest', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Get or create entry ID
    let entryId = req.query.entryId as string;
    if (!entryId) {
      // Create entry ID based on date (YYYYMMDD-HHMMSS)
      const now = new Date();
      entryId = now.toISOString()
        .replace(/[-:]/g, '')
        .replace('T', '-')
        .split('.')[0]; // Results in format: "20240214-143022"
    }

    console.log('File details:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      entryId
    });

    // Upload with entry organization
    const key = await uploadToS3(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      entryId
    );

    console.log('Upload successful with key:', key);
    res.json({ key, entryId });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: 'Upload failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
