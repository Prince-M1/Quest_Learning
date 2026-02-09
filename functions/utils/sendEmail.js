// ============================================
// GMAIL EMAIL UTILITY (Works from Nigeria)
// ============================================

import nodemailer from 'nodemailer';

const sendEmail = async (to, subject, html) => {
  console.log("📧 Attempting to send email via Gmail to:", to);
  console.log("📧 GMAIL_USER exists:", !!process.env.GMAIL_USER);
  console.log("📧 GMAIL_APP_PASSWORD exists:", !!process.env.GMAIL_APP_PASSWORD);
  
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    throw new Error("GMAIL_USER or GMAIL_APP_PASSWORD is not set in environment variables");
  }
  
  try {
    // Create transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });

    // Send email
    const info = await transporter.sendMail({
      from: `"Quest Learning" <${process.env.GMAIL_USER}>`,
      to: to,
      subject: subject,
      html: html
    });
    
    console.log("✅ Email sent successfully via Gmail:", info.messageId);
    return { id: info.messageId, success: true };
  } catch (err) {
    console.error("❌ Email failed to send via Gmail:", err.message);
    console.error("Full error:", err);
    throw err;
  }
};

export default sendEmail;