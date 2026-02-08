import express from 'express';
import AttentionCheckResponse from '../models/AttentionCheckResponse.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Create an attention check response
router.post('/', authenticateToken, async (req, res) => {
  try {
    const response = new AttentionCheckResponse(req.body);
    await response.save();
    res.status(201).json(response);
  } catch (error) {
    console.error('Error creating attention check response:', error);
    res.status(400).json({ message: error.message });
  }
});

// Get responses by student and video
router.get('/student/:studentId/video/:videoId', authenticateToken, async (req, res) => {
  try {
    const responses = await AttentionCheckResponse.find({
      student_id: req.params.studentId,
      video_id: req.params.videoId
    });
    res.json(responses);
  } catch (error) {
    console.error('Error fetching attention check responses:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get responses by student and subunit
router.get('/student/:studentId/subunit/:subunitId', authenticateToken, async (req, res) => {
  try {
    const responses = await AttentionCheckResponse.find({
      student_id: req.params.studentId,
      subunit_id: req.params.subunitId
    }).sort({ createdAt: -1 });
    res.json(responses);
  } catch (error) {
    console.error('Error fetching attention check responses:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;