import nodemailer from "nodemailer";

const sendEmail = async (to, subject, html) => {
  console.log("📧 Attempting to send email to:", to);
  console.log("📧 Using EMAIL_USER:", process.env.EMAIL_USER);
  console.log("📧 EMAIL_PASS exists:", !!process.env.EMAIL_PASS);
  console.log("📧 EMAIL_PASS length:", process.env.EMAIL_PASS?.length);
  
  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, 
    },
  });

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      html,
    });
    console.log("✅ Email sent successfully:", info.messageId);
  } catch (err) {
    console.error("❌ Email failed to send:", err.message);
    console.error("Full error:", err);
  }
};

export default sendEmail;