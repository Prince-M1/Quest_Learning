// ============================================
// MINIMAL FIX FOR YOUR auth.js
// ============================================
// Replace ONLY the /signup route in your auth.js file

// ❌ REMOVE THIS OLD SIGNUP ROUTE (around line 130-160):
/*
router.post("/signup", async (req, res) => {
  const { email, password, account_type, name } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const normalizedEmail = email.toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });
    
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = Date.now() + 10 * 60 * 1000;

    const user = new User({ 
      email: normalizedEmail, 
      password, 
      account_type, 
      name,
      verificationCode: code,
      verificationCodeExpires: expiry
    });

    await user.save(); // ❌ USER CREATED HERE - WRONG!

    try {
      await sendEmail(
        user.email, 
        "Your verification code", 
        `Your verification code is: ${code}`
      );
    } catch (emailErr) {
      console.error("❌ Email failed to send, but user was created:", emailErr);
    }

    res.status(201).json({ 
      message: "Signup successful! Check your email for the 6-digit code." 
    });

  } catch (err) {
    console.error("❌ Signup route error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});
*/

// ✅ REPLACE WITH THIS NEW SIGNUP ROUTE:
router.post("/signup", async (req, res) => {
  const { email, password, account_type, name } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const normalizedEmail = email.toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });
    
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = Date.now() + 10 * 60 * 1000;

    // ✅ STEP 1: TRY TO SEND EMAIL FIRST
    try {
      await sendEmail(
        normalizedEmail, 
        "Quest Learning - Verification Code", 
        `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4F46E5;">Welcome to Quest Learning!</h2>
          <p>Your verification code is:</p>
          <div style="background: #F3F4F6; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
            ${code}
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p style="color: #6B7280; font-size: 12px;">If you didn't request this, ignore this email.</p>
        </div>
        `
      );
      
      console.log(`✅ Email sent successfully to ${normalizedEmail}`);
      
      // ✅ STEP 2: ONLY CREATE USER AFTER EMAIL SUCCESS
      const user = new User({ 
        email: normalizedEmail, 
        password, 
        account_type, 
        name,
        verificationCode: code,
        verificationCodeExpires: expiry,
        isVerified: false // Not verified yet
      });

      await user.save();
      console.log(`✅ User created: ${normalizedEmail}`);

      res.status(201).json({ 
        message: "Signup successful! Check your email for the 6-digit code.",
        email: normalizedEmail
      });

    } catch (emailErr) {
      // ❌ EMAIL FAILED - DON'T CREATE USER
      console.error("❌ Email failed to send:", emailErr.message);
      return res.status(500).json({ 
        message: "Failed to send verification email. Please try again or use a different email address.",
        error: "Email delivery failed"
      });
    }

  } catch (err) {
    console.error("❌ Signup route error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});