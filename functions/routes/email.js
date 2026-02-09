import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import nodemailer from 'nodemailer';

const router = express.Router();

// Create transporter (configure with your email service)
const transporter = nodemailer.createTransporter({
  service: 'gmail', // or 'smtp', 'sendgrid', etc.
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD // Use app-specific password for Gmail
  }
});

// Send email
router.post('/send', authMiddleware, async (req, res) => {
  try {
    const { to, subject, body } = req.body;

    if (!to || !subject || !body) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    console.log(`📧 [EMAIL] Sending to: ${to}`);

    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      html: body.replace(/\n/g, '<br>')
    });

    console.log('✅ [EMAIL] Sent:', info.messageId);
    res.json({ success: true, messageId: info.messageId });

  } catch (error) {
    console.error('❌ [EMAIL] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;