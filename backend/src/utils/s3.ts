import { S3Client, GetObjectCommand, ListBucketsCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import AWS from 'aws-sdk'; // We'll use this for upload
import fs from 'fs';

// Add this debugging
console.log('AWS Config:', {
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID?.slice(0, 5) + '...', // Only log first 5 chars
  secretKeyExists: !!process.env.AWS_SECRET_ACCESS_KEY,
  bucketName: process.env.AWS_BUCKET_NAME
});

// First install: npm install aws-sdk

// Configure legacy SDK
const s3Legacy = new AWS.S3({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

// Keep existing S3Client for other operations
const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});

// Add this test function
async function testS3Connection() {
  try {
    const command = new ListBucketsCommand({});
    const response = await s3Client.send(command);
    console.log('S3 Connection Test - Buckets:', response.Buckets?.map(b => b.Name));
    return true;
  } catch (error) {
    console.error('S3 Connection Test Failed:', error);
    return false;
  }
}

export async function uploadToS3(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<string> {
  try {
    console.log('Starting upload with params:', {
      bucket: process.env.AWS_BUCKET_NAME,
      fileName,
      mimeType,
      bufferSize: fileBuffer.length
    });

    const key = `audio/${Date.now()}-${fileName}`;
    
    // Use legacy SDK for upload
    await s3Legacy.upload({
      Bucket: process.env.AWS_BUCKET_NAME!,
      Key: key,
      Body: fileBuffer,
      ContentType: mimeType
    }).promise();
    
    return key;
  } catch (error) {
    console.error('S3 upload error:', error);
    throw error;
  }
}

export async function getAudioUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME!,
    Key: key,
  });

  // Generate a URL that expires in 1 hour
  return getSignedUrl(s3Client, command, { expiresIn: 3600 });
}

// Add this new function
export async function downloadFromS3(key: string, localPath: string): Promise<void> {
  const response = await s3Client.getObject({
    Bucket: process.env.AWS_BUCKET_NAME!,
    Key: key
  }).promise();

  if (response.Body) {
    fs.writeFileSync(localPath, response.Body);
  } else {
    throw new Error('Empty response body from S3');
  }
}