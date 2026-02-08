import express from 'express';
import AttentionCheck from '../models/AttentionCheck.js';
import { authenticateToken } from '../middleware/auth.js'; // Adjust path as needed

const router = express.Router();

// Get all attention checks for a video
router.get('/video/:videoId', authenticateToken, async (req, res) => {
  try {
    const attentionChecks = await AttentionCheck.find({ 
      video_id: req.params.videoId 
    }).sort({ check_order: 1 });
    
    res.json(attentionChecks);
  } catch (error) {
    console.error('Error fetching attention checks:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all attention checks (for loading all at once)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const attentionChecks = await AttentionCheck.find().sort({ check_order: 1 });
    res.json(attentionChecks);
  } catch (error) {
    console.error('Error fetching attention checks:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new attention check
router.post('/', authenticateToken, async (req, res) => {
  try {
    const attentionCheck = new AttentionCheck(req.body);
    await attentionCheck.save();
    res.status(201).json(attentionCheck);
  } catch (error) {
    console.error('Error creating attention check:', error);
    res.status(400).json({ message: error.message });
  }
});

// Create multiple attention checks at once
router.post('/bulk', authenticateToken, async (req, res) => {
  try {
    const { checks } = req.body;
    const attentionChecks = await AttentionCheck.insertMany(checks);
    res.status(201).json(attentionChecks);
  } catch (error) {
    console.error('Error creating attention checks:', error);
    res.status(400).json({ message: error.message });
  }
});

// Update an attention check
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const attentionCheck = await AttentionCheck.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!attentionCheck) {
      return res.status(404).json({ message: 'Attention check not found' });
    }
    
    res.json(attentionCheck);
  } catch (error) {
    console.error('Error updating attention check:', error);
    res.status(400).json({ message: error.message });
  }
});

// Delete an attention check
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const attentionCheck = await AttentionCheck.findByIdAndDelete(req.params.id);
    
    if (!attentionCheck) {
      return res.status(404).json({ message: 'Attention check not found' });
    }
    
    res.json({ message: 'Attention check deleted' });
  } catch (error) {
    console.error('Error deleting attention check:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete all attention checks for a video
router.delete('/video/:videoId', authenticateToken, async (req, res) => {
  try {
    const result = await AttentionCheck.deleteMany({ video_id: req.params.videoId });
    res.json({ message: `Deleted ${result.deletedCount} attention checks` });
  } catch (error) {
    console.error('Error deleting attention checks:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;