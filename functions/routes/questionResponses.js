import express from 'express';
import jwt from 'jsonwebtoken';
import QuestionResponse from '../models/QuestionResponse.js';

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

// GET all responses for a student (ADD THIS - needed for TeacherStudentDetail)
router.get('/student/:studentId', async (req, res) => {
  try {
    const responses = await QuestionResponse.find({
      student_id: req.params.studentId
    }).sort({ createdAt: -1 });
    
    res.json(responses);
  } catch (error) {
    console.error('Error fetching question responses:', error);
    res.status(500).json({ error: 'Failed to fetch question responses' });
  }
});

// Create a question response
router.post('/', async (req, res) => {
  try {
    const response = new QuestionResponse(req.body);
    await response.save();
    res.status(201).json(response);
  } catch (error) {
    console.error('Error creating question response:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get responses by student and quiz
router.get('/student/:studentId/quiz/:quizId', async (req, res) => {
  try {
    const responses = await QuestionResponse.find({
      student_id: req.params.studentId,
      quiz_id: req.params.quizId
    });
    res.json(responses);
  } catch (error) {
    console.error('Error fetching question responses:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get responses by student and subunit
router.get('/student/:studentId/subunit/:subunitId', async (req, res) => {
  try {
    const responses = await QuestionResponse.find({
      student_id: req.params.studentId,
      subunit_id: req.params.subunitId
    }).sort({ createdAt: -1 });
    res.json(responses);
  } catch (error) {
    console.error('Error fetching question responses:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;