// routes/navigationLogs.js
import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', authMiddleware, async (req, res) => {
  // Just acknowledge - you can store if you want
  console.log('📍 Navigation:', req.body.page_name);
  res.json({ success: true });
});

export default router;