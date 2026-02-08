import express from 'express';
import QuizResult from '../models/QuizResult.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Create a quiz result
router.post('/', authenticateToken, async (req, res) => {
  try {
    const result = new QuizResult(req.body);
    await result.save();
    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating quiz result:', error);
    res.status(400).json({ message: error.message });
  }
});

// Get results by student
router.get('/student/:studentId', authenticateToken, async (req, res) => {
  try {
    const results = await QuizResult.find({
      student_id: req.params.studentId
    }).sort({ completed_at: -1 });
    res.json(results);
  } catch (error) {
    console.error('Error fetching quiz results:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get results by student and quiz
router.get('/student/:studentId/quiz/:quizId', authenticateToken, async (req, res) => {
  try {
    const results = await QuizResult.find({
      student_id: req.params.studentId,
      quiz_id: req.params.quizId
    }).sort({ completed_at: -1 });
    res.json(results);
  } catch (error) {
    console.error('Error fetching quiz results:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;