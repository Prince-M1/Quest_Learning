import express from 'express';
import jwt from 'jsonwebtoken';
import Question from '../models/Question.js';

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

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get all questions
router.get('/', async (req, res) => {
  try {
    const questions = await Question.find({}).sort({ question_order: 1 });
    res.json(questions);
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

// Get questions by quiz_id
router.get('/quiz/:quizId', async (req, res) => {
  try {
    const questions = await Question.find({
      quiz_id: req.params.quizId
    }).sort({ question_order: 1 });
    
    res.json(questions);
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

// Get question by ID
router.get('/:id', async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }
    
    res.json(question);
  } catch (error) {
    console.error('Error fetching question:', error);
    res.status(500).json({ error: 'Failed to fetch question' });
  }
});

// Create question
router.post('/', async (req, res) => {
  try {
    const question = new Question(req.body);
    await question.save();
    
    res.status(201).json(question);
  } catch (error) {
    console.error('Error creating question:', error);
    res.status(500).json({ error: 'Failed to create question' });
  }
});

// Update question
router.put('/:id', async (req, res) => {
  try {
    const question = await Question.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }
    
    res.json(question);
  } catch (error) {
    console.error('Error updating question:', error);
    res.status(500).json({ error: 'Failed to update question' });
  }
});

// Delete question
router.delete('/:id', async (req, res) => {
  try {
    const question = await Question.findByIdAndDelete(req.params.id);
    
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }
    
    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({ error: 'Failed to delete question' });
  }
});

export default router;