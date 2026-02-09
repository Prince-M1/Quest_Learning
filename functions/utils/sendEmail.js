import nodemailer from "nodemailer";

const sendEmail = async (to, subject, html) => {
  console.log("📧 Attempting to send email to:", to);
  console.log("📧 Using EMAIL_USER:", process.env.EMAIL_USER);
  console.log("📧 EMAIL_PASS exists:", !!process.env.EMAIL_PASS);
  console.log("📧 EMAIL_PASS length:", process.env.EMAIL_PASS?.length);
  
  // ✅ FIXED: Explicit SMTP configuration instead of service shorthand
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, 
    },
    // ✅ Add these for better reliability
    tls: {
      rejectUnauthorized: false // Accept self-signed certificates
    },
    connectionTimeout: 10000, // 10 second timeout
    greetingTimeout: 10000,
    socketTimeout: 10000
  });

  try {
    const info = await transporter.sendMail({
      from: `"Quest Learning" <${process.env.EMAIL_USER}>`, // ✅ Better sender format
      to,
      subject,
      html,
    });
    console.log("✅ Email sent successfully:", info.messageId);
    return info;
  } catch (err) {
    console.error("❌ Email failed to send:", err.message);
    console.error("Full error:", err);
    throw err; // ✅ Throw error so signup route knows it failed
  }
};

export default sendEmail;