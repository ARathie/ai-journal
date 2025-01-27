import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function uploadToS3(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<string> {
  const uploadParams = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: `audio/${fileName}`,
    Body: fileBuffer,
    ContentType: mimeType,
  };

  await s3Client.send(new PutObjectCommand(uploadParams));

  return `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/audio/${fileName}`;
}

export async function generateSignedUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn: 3600 }); // URL expires in 1 hour
}