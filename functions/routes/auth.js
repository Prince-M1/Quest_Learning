import express from "express";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import User from "../models/users.js";
import { OAuth2Client } from "google-auth-library";
import generateVerificationToken from "../utils/generateVerificationToken.js";
import sendEmail from "../utils/sendEmail.js";
import Stripe from 'stripe';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Initialize Google client
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Middleware to verify JWT
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized: Missing Bearer token" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id; // save user id for next
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

// Verify email route
router.get("/verify-email", async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).send("Verification token missing");

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(400).send("Invalid token");

    user.isVerified = true;
    await user.save();

    res.redirect(`${process.env.FRONTEND_URL}/signin?verified=true`);
  } catch (err) {
    console.error(err);
    res.status(400).send("Verification failed or token expired");
  }
});

// Resend OTP
router.post("/resend-otp", async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const otp = Math.floor(100000 + Math.random() * 900000);
    user.otp = otp;
    user.otpExpires = Date.now() + 5 * 60 * 1000;
    await user.save();

    console.log(`OTP for ${email}: ${otp}`);

    res.json({ message: "OTP resent successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Forgot password
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ message: "Email is required" });

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    await sendEmail(
      user.email,
      "Quest Learning Password Reset",
      `Click the link to reset your password (valid for 1 hour): <a href="${resetUrl}">${resetUrl}</a>`
    );

    res.json({ message: "Reset link sent to your email." });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ message: "Something went wrong." });
  }
});

// Reset password
router.post("/reset-password", async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ message: "Missing token or password" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.password = password;
    await user.save();

    res.json({ message: "Password reset successful" });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: "Invalid or expired token" });
  }
});

// Google OAuth login/signup
router.post("/google", async (req, res) => {
  const token = req.body.token || req.body.credential;
  if (!token) return res.status(400).json({ message: "Token is required" });

  try {
    let email, name, picture;

    if (token.startsWith('ya29.')) {
      const googleRes = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${token}`);
      const userInfo = await googleRes.json();
      
      if (!googleRes.ok) throw new Error("Google info fetch failed");
      
      email = userInfo.email;
      name = userInfo.name;
      picture = userInfo.picture;
    } else {
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      email = payload.email;
      name = payload.name;
      picture = payload.picture;
    }

    let user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      user = new User({ 
        email: email.toLowerCase(), 
        name: name,
        isVerified: true 
      });
      await user.save();
    }

    const jwtToken = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token: jwtToken, user: { id: user._id, email: user.email, account_type: user.account_type } });
  } catch (err) {
    console.error("❌ [GOOGLE] Auth Error:", err.message);
    res.status(401).json({ message: "Invalid Google token" });
  }
});

// Signup with 6-digit verification code
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

    await user.save();

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

// Verify 6-digit code
router.post("/verify-code", async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) return res.status(400).json({ message: "Email and code are required" });

  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ message: "Invalid email" });

  if (user.verificationCode !== code || user.verificationCodeExpires < Date.now()) {
    return res.status(400).json({ message: "Invalid or expired code" });
  }

  user.isVerified = true;
  user.verificationCode = null;
  user.verificationCodeExpires = null;
  await user.save();

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

  res.json({ token, user: { id: user._id, email: user.email, account_type: user.account_type } });
});

// Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: "Email and password are required" });

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid email or password" });

    if (!user.isVerified) {
      return res.status(403).json({ message: "Email not verified. Please check your inbox." });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ message: "Invalid email or password" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: { id: user._id, email: user.email, account_type: user.account_type } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get current user
router.get("/me", async (req, res) => {
  console.log("🔍 [ME] /me route hit");
  const authHeader = req.headers.authorization;
  console.log("🔍 [ME] Authorization header:", authHeader);

  if (!authHeader?.startsWith("Bearer ")) {
    console.log("⚠️ [ME] Missing or malformed Bearer token");
    return res.status(401).json({ message: "Unauthorized: Missing Bearer token" });
  }

  const token = authHeader.split(" ")[1];
  console.log("🔍 [ME] Token extracted:", token);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("✅ [ME] JWT decoded:", decoded);

    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      console.log("⚠️ [ME] User not found in DB");
      return res.status(404).json({ message: "User not found" });
    }

    console.log("✅ [ME] User found:", user.email);
    res.json(user);
  } catch (err) {
    console.error("❌ [ME] Token verification failed:", err.message);
    res.status(401).json({ message: "Invalid token" });
  }
});

// ✅ Update user role (for Free plan)
router.post("/user/role", authMiddleware, async (req, res) => {
  const { account_type } = req.body;

  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.userId,
      { 
        $set: { 
          account_type: account_type,
          subscription_status: 'active' 
        } 
      },
      { new: true }
    ).select("-password");

    if (!updatedUser) return res.status(404).json({ message: "User not found" });

    res.json({ 
      message: "Role updated successfully", 
      user: updatedUser 
    });
  } catch (err) {
    console.error("❌ [ROLE] Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Update profile
router.post("/update-profile", authMiddleware, async (req, res) => {
  const { full_name } = req.body;

  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.userId,
      { $set: { name: full_name } },
      { new: true }
    ).select("-password");

    if (!updatedUser) return res.status(404).json({ message: "User not found" });

    console.log(`✅ [PROFILE] Updated name to: ${full_name}`);

    res.json({ 
      message: "Profile updated successfully", 
      user: updatedUser 
    });
  } catch (err) {
    console.error("❌ [PROFILE] Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ UPDATED: Create Stripe checkout with 30-day trial
router.post("/create-checkout", authMiddleware, async (req, res) => {
  const { priceId, successUrl, cancelUrl } = req.body;

  if (!priceId || !successUrl || !cancelUrl) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let customerId = user.stripe_customer_id;

    // Create Stripe customer if they don't have one
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId: user._id.toString(),
          name: user.name
        }
      });
      customerId = customer.id;

      // Save customer ID to user
      await User.findByIdAndUpdate(req.userId, { stripe_customer_id: customerId });
    }

    // Create checkout session with 30-day trial
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        }
      ],
      subscription_data: {
        trial_period_days: 30, // ✅ 30-day free trial
        metadata: {
          userId: user._id.toString(),
        }
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: user._id.toString(),
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("❌ [STRIPE] Checkout Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ NEW: Stripe webhook handler
router.post("/webhook", express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('⚠️ Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      const userId = session.client_reference_id;
      
      await User.findByIdAndUpdate(userId, {
        subscription_status: 'trialing', // Start as trialing (30-day trial)
        subscription_tier: 'premium',
        subscription_id: session.subscription
      });
      console.log(`✅ User ${userId} subscription activated (trial)`);
      break;

    case 'customer.subscription.updated':
      const updatedSub = event.data.object;
      const customer1 = await stripe.customers.retrieve(updatedSub.customer);
      const userId1 = customer1.metadata.userId;
      
      const status = updatedSub.status === 'active' ? 'active' : 
                     updatedSub.status === 'trialing' ? 'trialing' : 
                     'inactive';
      
      await User.findByIdAndUpdate(userId1, {
        subscription_status: status,
        subscription_tier: status === 'active' || status === 'trialing' ? 'premium' : 'basic'
      });
      console.log(`✅ User ${userId1} subscription updated to ${status}`);
      break;

    case 'customer.subscription.deleted':
      const deletedSub = event.data.object;
      const customer2 = await stripe.customers.retrieve(deletedSub.customer);
      const userId2 = customer2.metadata.userId;
      
      await User.findByIdAndUpdate(userId2, {
        subscription_status: 'inactive',
        subscription_tier: 'basic'
      });
      console.log(`✅ User ${userId2} subscription canceled`);
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

// Generic update
router.post("/update-me", authMiddleware, async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.userId,
      { $set: req.body }, 
      { new: true }
    ).select("-password");
    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ message: "Update failed" });
  }
});

export default router;