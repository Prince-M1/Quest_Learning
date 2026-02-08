import express from 'express';
import jwt from 'jsonwebtoken';
import CaseStudy from '../models/CaseStudy.js';

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

// Get all case studies
router.get('/', async (req, res) => {
  try {
    const caseStudies = await CaseStudy.find({}).sort({ createdAt: -1 });
    res.json(caseStudies);
  } catch (error) {
    console.error('Error fetching case studies:', error);
    res.status(500).json({ error: 'Failed to fetch case studies' });
  }
});

// Get case study by subunit_id
router.get('/subunit/:subunitId', async (req, res) => {
  try {
    const caseStudy = await CaseStudy.findOne({
      subunit_id: req.params.subunitId
    });
    
    if (!caseStudy) {
      return res.status(404).json({ error: 'Case study not found' });
    }
    
    res.json(caseStudy);
  } catch (error) {
    console.error('Error fetching case study:', error);
    res.status(500).json({ error: 'Failed to fetch case study' });
  }
});

// Get case study by ID
router.get('/:id', async (req, res) => {
  try {
    const caseStudy = await CaseStudy.findById(req.params.id);
    
    if (!caseStudy) {
      return res.status(404).json({ error: 'Case study not found' });
    }
    
    res.json(caseStudy);
  } catch (error) {
    console.error('Error fetching case study:', error);
    res.status(500).json({ error: 'Failed to fetch case study' });
  }
});

// Create case study
router.post('/', async (req, res) => {
  try {
    const caseStudy = new CaseStudy(req.body);
    await caseStudy.save();
    
    res.status(201).json(caseStudy);
  } catch (error) {
    console.error('Error creating case study:', error);
    res.status(500).json({ error: 'Failed to create case study' });
  }
});

// Update case study
router.put('/:id', async (req, res) => {
  try {
    const caseStudy = await CaseStudy.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    
    if (!caseStudy) {
      return res.status(404).json({ error: 'Case study not found' });
    }
    
    res.json(caseStudy);
  } catch (error) {
    console.error('Error updating case study:', error);
    res.status(500).json({ error: 'Failed to update case study' });
  }
});

// Delete case study
router.delete('/:id', async (req, res) => {
  try {
    const caseStudy = await CaseStudy.findByIdAndDelete(req.params.id);
    
    if (!caseStudy) {
      return res.status(404).json({ error: 'Case study not found' });
    }
    
    res.json({ message: 'Case study deleted successfully' });
  } catch (error) {
    console.error('Error deleting case study:', error);
    res.status(500).json({ error: 'Failed to delete case study' });
  }
});

export default router;