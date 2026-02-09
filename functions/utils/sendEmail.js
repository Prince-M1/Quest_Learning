import nodemailer from "nodemailer";

const sendEmail = async (to, subject, html) => {
  console.log("📧 Attempting to send email to:", to);
  console.log("📧 Using EMAIL_USER:", process.env.EMAIL_USER);
  console.log("📧 EMAIL_PASS exists:", !!process.env.EMAIL_PASS);
  console.log("📧 EMAIL_PASS length:", process.env.EMAIL_PASS?.length);
  
  // ✅ FIXED: Explicit SMTP configuration with better timeouts
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // Use TLS (STARTTLS)
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, 
    },
    tls: {
      rejectUnauthorized: false, // Accept self-signed certificates
      ciphers: 'SSLv3'
    },
    connectionTimeout: 20000, // 20 seconds (increased from default 10)
    greetingTimeout: 20000,   // 20 seconds
    socketTimeout: 20000,     // 20 seconds
    pool: true,               // Use pooled connections
    maxConnections: 5,
    maxMessages: 100
  });

  try {
    // ✅ Verify connection before sending
    await transporter.verify();
    console.log("✅ SMTP connection verified");

    const info = await transporter.sendMail({
      from: `"Quest Learning" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    
    console.log("✅ Email sent successfully:", info.messageId);
    console.log("📬 Response:", info.response);
    return info;
  } catch (err) {
    console.error("❌ Email failed to send:", err.message);
    console.error("Full error:", err);
    throw err; // ✅ Throw error so signup route knows it failed
  }
};

export default sendEmail;