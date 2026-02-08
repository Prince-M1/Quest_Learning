import express from 'express';
import jwt from 'jsonwebtoken';
import InquiryResponse from '../models/InquiryResponse.js';

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

// Get inquiry responses for a student
router.get('/student/:studentId', async (req, res) => {
  try {
    const responses = await InquiryResponse.find({
      student_id: req.params.studentId
    }).sort({ createdAt: -1 });
    
    res.json(responses);
  } catch (error) {
    console.error('Error fetching inquiry responses:', error);
    res.status(500).json({ error: 'Failed to fetch inquiry responses' });
  }
});

// Get inquiry responses for a subunit
router.get('/subunit/:subunitId', async (req, res) => {
  try {
    const responses = await InquiryResponse.find({
      subunit_id: req.params.subunitId
    }).sort({ createdAt: -1 });
    
    res.json(responses);
  } catch (error) {
    console.error('Error fetching inquiry responses:', error);
    res.status(500).json({ error: 'Failed to fetch inquiry responses' });
  }
});

// ✅ NEW: Get inquiry responses by student and subunit (needed for TeacherAnalytics)
router.get('/student/:studentId/subunit/:subunitId', async (req, res) => {
  try {
    const responses = await InquiryResponse.find({
      student_id: req.params.studentId,
      subunit_id: req.params.subunitId
    }).sort({ createdAt: -1 });
    
    res.json(responses);
  } catch (error) {
    console.error('Error fetching inquiry responses:', error);
    res.status(500).json({ error: 'Failed to fetch inquiry responses' });
  }
});

// Create inquiry response
router.post('/', async (req, res) => {
  try {
    const inquiryResponse = new InquiryResponse(req.body);
    await inquiryResponse.save();
    
    res.status(201).json(inquiryResponse);
  } catch (error) {
    console.error('Error creating inquiry response:', error);
    res.status(500).json({ error: 'Failed to create inquiry response' });
  }
});

export default router;