import express from 'express';
const router = express.Router();

// Add your upload routes here
router.post('/upload', (req, res) => {
    res.status(200).json({ message: 'Upload endpoint' });
});

export default router;
