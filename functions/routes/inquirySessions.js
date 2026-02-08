import express from 'express';
import jwt from 'jsonwebtoken';
import InquirySession from '../models/InquirySession.js';

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

// Get inquiry session by subunit_id
router.get('/subunit/:subunitId', async (req, res) => {
  try {
    const inquirySession = await InquirySession.findOne({
      subunit_id: req.params.subunitId
    });
    
    if (!inquirySession) {
      return res.status(404).json({ error: 'Inquiry session not found' });
    }
    
    res.json(inquirySession);
  } catch (error) {
    console.error('Error fetching inquiry session:', error);
    res.status(500).json({ error: 'Failed to fetch inquiry session' });
  }
});

// Get inquiry session by ID
router.get('/:id', async (req, res) => {
  try {
    const inquirySession = await InquirySession.findById(req.params.id);
    
    if (!inquirySession) {
      return res.status(404).json({ error: 'Inquiry session not found' });
    }
    
    res.json(inquirySession);
  } catch (error) {
    console.error('Error fetching inquiry session:', error);
    res.status(500).json({ error: 'Failed to fetch inquiry session' });
  }
});

// Create inquiry session
router.post('/', async (req, res) => {
  try {
    const inquirySession = new InquirySession(req.body);
    await inquirySession.save();
    
    res.status(201).json(inquirySession);
  } catch (error) {
    console.error('Error creating inquiry session:', error);
    res.status(500).json({ error: 'Failed to create inquiry session' });
  }
});

// Update inquiry session
router.put('/:id', async (req, res) => {
  try {
    const inquirySession = await InquirySession.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    
    if (!inquirySession) {
      return res.status(404).json({ error: 'Inquiry session not found' });
    }
    
    res.json(inquirySession);
  } catch (error) {
    console.error('Error updating inquiry session:', error);
    res.status(500).json({ error: 'Failed to update inquiry session' });
  }
});

// Delete inquiry session
router.delete('/:id', async (req, res) => {
  try {
    const inquirySession = await InquirySession.findByIdAndDelete(req.params.id);
    
    if (!inquirySession) {
      return res.status(404).json({ error: 'Inquiry session not found' });
    }
    
    res.json({ message: 'Inquiry session deleted successfully' });
  } catch (error) {
    console.error('Error deleting inquiry session:', error);
    res.status(500).json({ error: 'Failed to delete inquiry session' });
  }
});

export default router;