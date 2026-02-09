// ============================================
// RESEND EMAIL UTILITY (Works from Nigeria)
// ============================================

import { Resend } from 'resend';

const sendEmail = async (to, subject, html) => {
  console.log("📧 Attempting to send email via Resend to:", to);
  console.log("📧 RESEND_API_KEY exists:", !!process.env.RESEND_API_KEY);
  
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not set in environment variables");
  }
  
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    const { data, error } = await resend.emails.send({
      from: 'Quest Learning <onboarding@resend.dev>', // Free sender for testing
      to: to,
      subject: subject,
      html: html,
    });

    if (error) {
      console.error("❌ Resend API error:", error);
      throw error;
    }
    
    console.log("✅ Email sent successfully via Resend:", data.id);
    return data;
  } catch (err) {
    console.error("❌ Email failed to send via Resend:", err.message);
    console.error("Full error:", err);
    throw err;
  }
};

export default sendEmail;