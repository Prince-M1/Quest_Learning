import express from 'express';
import jwt from 'jsonwebtoken';
import AttentionCheckResponse from '../models/AttentionCheckResponse.js';

const router = express.Router();

// Auth middleware
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized: Missing Bearer token" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

router.use(authMiddleware);

// GET all attention check responses for a student (ADD THIS)
router.get('/student/:studentId', async (req, res) => {
  try {
    const responses = await AttentionCheckResponse.find({
      student_id: req.params.studentId
    }).sort({ createdAt: -1 });
    
    res.json(responses);
  } catch (error) {
    console.error('Error fetching attention check responses:', error);
    res.status(500).json({ error: 'Failed to fetch attention check responses' });
  }
});

// Create an attention check response
router.post('/', async (req, res) => {
  try {
    const response = new AttentionCheckResponse(req.body);
    await response.save();
    res.status(201).json(response);
  } catch (error) {
    console.error('Error creating attention check response:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get responses by student and video
router.get('/student/:studentId/video/:videoId', async (req, res) => {
  try {
    const responses = await AttentionCheckResponse.find({
      student_id: req.params.studentId,
      video_id: req.params.videoId
    });
    res.json(responses);
  } catch (error) {
    console.error('Error fetching attention check responses:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get responses by student and subunit
router.get('/student/:studentId/subunit/:subunitId', async (req, res) => {
  try {
    const responses = await AttentionCheckResponse.find({
      student_id: req.params.studentId,
      subunit_id: req.params.subunitId
    }).sort({ createdAt: -1 });
    res.json(responses);
  } catch (error) {
    console.error('Error fetching attention check responses:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;