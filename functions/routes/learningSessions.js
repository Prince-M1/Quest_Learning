import express from 'express';
import LearningSession from '../models/LearningSession.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Create a learning session
router.post('/', authenticateToken, async (req, res) => {
  try {
    const session = new LearningSession(req.body);
    await session.save();
    res.status(201).json(session);
  } catch (error) {
    console.error('Error creating learning session:', error);
    res.status(400).json({ message: error.message });
  }
});

// Get sessions by student
router.get('/student/:studentId', authenticateToken, async (req, res) => {
  try {
    const sessions = await LearningSession.find({
      student_id: req.params.studentId
    }).sort({ start_time: -1 });
    res.json(sessions);
  } catch (error) {
    console.error('Error fetching learning sessions:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get sessions by student and subunit
router.get('/student/:studentId/subunit/:subunitId', authenticateToken, async (req, res) => {
  try {
    const sessions = await LearningSession.find({
      student_id: req.params.studentId,
      subunit_id: req.params.subunitId
    }).sort({ start_time: -1 });
    res.json(sessions);
  } catch (error) {
    console.error('Error fetching learning sessions:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
// GET learning sessions by student_id (for streak calculation)
router.get("/student/:studentId", authenticateToken, async (req, res) => {
  try {
    const sessions = await LearningSession.find({ 
      student_id: req.params.studentId 
    }).sort({ start_time: -1 }); // Sort by most recent first
    
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST create learning session
router.post("/", authenticateToken, async (req, res) => {
  try {
    const session = new LearningSession(req.body);
    const savedSession = await session.save();
    res.status(201).json(savedSession);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// GET all sessions (optional)
router.get("/", authenticateToken, async (req, res) => {
  try {
    const sessions = await LearningSession.find();
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;