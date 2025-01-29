import express from 'express';
import { concatenateAudioFiles } from '../utils/ffmpeg';

const router = express.Router();

router.get('/test', (req, res) => {
  res.json({ message: 'Entries router is working' });
});

router.post('/:entryId/concatenate', async (req, res) => {
  try {
    const { fileKeys } = req.body;
    const { entryId } = req.params;  // This should now be a date-based ID

    if (!fileKeys || fileKeys.length === 0) {
      return res.json({ 
        success: true,
        mergedFileKey: null,
        message: 'No audio files to concatenate'
      });
    }

    if (!Array.isArray(fileKeys)) {
      return res.status(400).json({ 
        error: 'Invalid request',
        details: 'fileKeys must be an array'
      });
    }

    console.log('Concatenating files for entry:', entryId, 'Files:', fileKeys);

    const mergedFileKey = await concatenateAudioFiles(fileKeys, entryId);
    
    res.json({ 
      success: true,
      mergedFileKey,
      message: 'Audio files concatenated successfully'
    });
  } catch (error) {
    console.error('Concatenation error:', error);
    res.status(500).json({ 
      error: 'Failed to concatenate audio files',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// You might also want to add a route to get entry details
router.get('/:entryId', async (req, res) => {
  try {
    const { entryId } = req.params;
    
    // Here you would fetch entry details from your database
    // Including both text content and audio file key (if exists)
    
    res.json({
      id: entryId,
      text: "Sample entry text",
      audioKey: "audio/merged/123.m4a", // null if no audio
      createdAt: new Date(),
      // ... other entry details
    });
  } catch (error) {
    console.error('Error fetching entry:', error);
    res.status(500).json({ 
      error: 'Failed to fetch entry',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 