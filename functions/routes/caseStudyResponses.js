import express from 'express';
import jwt from 'jsonwebtoken';
import CaseStudyResponse from '../models/CaseStudyResponse.js';

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

// Get all case study responses for a student
router.get('/student/:studentId', async (req, res) => {
  try {
    const responses = await CaseStudyResponse.find({
      student_id: req.params.studentId
    }).sort({ createdAt: -1 });
    
    res.json(responses);
  } catch (error) {
    console.error('Error fetching case study responses:', error);
    res.status(500).json({ error: 'Failed to fetch case study responses' });
  }
});

// Get case study response for a specific subunit
router.get('/student/:studentId/subunit/:subunitId', async (req, res) => {
  try {
    const response = await CaseStudyResponse.findOne({
      student_id: req.params.studentId,
      subunit_id: req.params.subunitId
    }).sort({ createdAt: -1 });
    
    if (!response) {
      return res.status(404).json({ error: 'Case study response not found' });
    }
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching case study response:', error);
    res.status(500).json({ error: 'Failed to fetch case study response' });
  }
});

// Create case study response
router.post('/', async (req, res) => {
  try {
    const response = new CaseStudyResponse(req.body);
    await response.save();
    
    res.status(201).json(response);
  } catch (error) {
    console.error('Error creating case study response:', error);
    res.status(400).json({ error: error.message });
  }
});

// Update case study response
router.put('/:id', async (req, res) => {
  try {
    const response = await CaseStudyResponse.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    
    if (!response) {
      return res.status(404).json({ error: 'Case study response not found' });
    }
    
    res.json(response);
  } catch (error) {
    console.error('Error updating case study response:', error);
    res.status(500).json({ error: 'Failed to update case study response' });
  }
});

export default router;