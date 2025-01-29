import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import AWS from 'aws-sdk';
import fs from 'fs';

// Configure legacy SDK (v2) for uploads and downloads
const s3Legacy = new AWS.S3({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

// Configure v3 client for signed URLs
const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});

// Debug logging
console.log('AWS Config:', {
  region: process.env.AWS_REGION,
  accessKeyIdExists: !!process.env.AWS_ACCESS_KEY_ID,
  secretKeyExists: !!process.env.AWS_SECRET_ACCESS_KEY,
  bucketName: process.env.AWS_BUCKET_NAME
});

// Use v2 for uploads
export async function uploadToS3(
  fileBuffer: Buffer,
  key: string,
  mimeType: string,
  entryId?: string  // Optional parameter for entry-related files
): Promise<string> {
  try {
    // If entryId is provided, organize under entries directory
    const finalKey = entryId 
      ? `entries/${entryId}/originals/${Date.now()}-${key}`
      : key;

    console.log('Starting upload with params:', {
      bucket: process.env.AWS_BUCKET_NAME,
      key: finalKey,
      mimeType,
      bufferSize: fileBuffer.length
    });
    
    await s3Legacy.upload({
      Bucket: process.env.AWS_BUCKET_NAME!,
      Key: finalKey,
      Body: fileBuffer,
      ContentType: mimeType
    }).promise();
    
    return finalKey;
  } catch (error) {
    console.error('S3 upload error:', error);
    throw error;
  }
}

// Use v3 for signed URLs
export async function getAudioUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME!,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn: 3600 });
}

// Use v2 for downloads
export async function downloadFromS3(key: string, localPath: string): Promise<void> {
  const response = await s3Legacy.getObject({
    Bucket: process.env.AWS_BUCKET_NAME!,
    Key: key
  }).promise();

  if (response.Body) {
    fs.writeFileSync(localPath, response.Body as Buffer);
  } else {
    throw new Error('Empty response body from S3');
  }
}