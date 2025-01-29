import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { downloadFromS3, uploadToS3 } from './s3';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Configure ffmpeg and ffprobe paths
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// Get ffprobe path from system installation
const ffprobePath = '/usr/local/bin/ffprobe';  // Default Homebrew installation path
if (fs.existsSync(ffprobePath)) {
  ffmpeg.setFfprobePath(ffprobePath);
} else {
  console.warn('ffprobe not found at', ffprobePath);
}

export async function concatenateAudioFiles(fileKeys: string[], entryId: string): Promise<string> {
  try {
    // Create temp directory
    const tempDir = path.join(os.tmpdir(), 'audio-concat-' + Date.now());
    fs.mkdirSync(tempDir, { recursive: true });
    
    console.log('Created temp directory:', tempDir);

    // Download all files
    const localFiles = await Promise.all(
      fileKeys.map(async (key, index) => {
        const localPath = path.join(tempDir, `chunk-${index}${path.extname(key)}`);
        await downloadFromS3(key, localPath);
        return localPath;
      })
    );

    console.log('Downloaded files:', localFiles);

    // Create output path
    const outputPath = path.join(tempDir, `merged-${entryId}.m4a`);
    
    // Merge files
    await new Promise<void>((resolve, reject) => {
      const command = ffmpeg();
      
      localFiles.forEach(file => {
        command.input(file);
      });

      command
        .on('error', (err) => {
          console.error('FFmpeg error:', err);
          reject(err);
        })
        .on('end', () => {
          console.log('FFmpeg process completed');
          resolve();
        })
        .mergeToFile(outputPath, tempDir);
    });

    console.log('Merged file created:', outputPath);

    // Create organized path for merged file
    const key = `entries/${entryId}/merged/final.m4a`;

    // Upload merged file to S3
    await uploadToS3(
      fs.readFileSync(outputPath),
      key,
      'audio/m4a'
    );

    console.log('Uploaded merged file to S3:', key);

    // Clean up temp files
    localFiles.forEach(file => fs.unlinkSync(file));
    fs.unlinkSync(outputPath);
    fs.rmdirSync(tempDir);

    return key;
  } catch (error) {
    console.error('Error in concatenateAudioFiles:', error);
    throw error;
  }
} 