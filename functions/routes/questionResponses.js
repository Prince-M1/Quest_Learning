import express from 'express';
import QuestionResponse from '../models/QuestionResponse.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Create a question response
router.post('/', authenticateToken, async (req, res) => {
  try {
    const response = new QuestionResponse(req.body);
    await response.save();
    res.status(201).json(response);
  } catch (error) {
    console.error('Error creating question response:', error);
    res.status(400).json({ message: error.message });
  }
});

// Get responses by student and quiz
router.get('/student/:studentId/quiz/:quizId', authenticateToken, async (req, res) => {
  try {
    const responses = await QuestionResponse.find({
      student_id: req.params.studentId,
      quiz_id: req.params.quizId
    });
    res.json(responses);
  } catch (error) {
    console.error('Error fetching question responses:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get responses by student and subunit
router.get('/student/:studentId/subunit/:subunitId', authenticateToken, async (req, res) => {
  try {
    const responses = await QuestionResponse.find({
      student_id: req.params.studentId,
      subunit_id: req.params.subunitId
    }).sort({ createdAt: -1 });
    res.json(responses);
  } catch (error) {
    console.error('Error fetching question responses:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;