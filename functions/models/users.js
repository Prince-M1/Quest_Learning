import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { 
      type: String, 
      required: function() { return this.authProvider === "local"; } 
    },
    googleId: { type: String },
    isVerified: { type: Boolean, default: false },  
    authProvider: {
      type: String,
      enum: ["local", "google", "microsoft", "facebook"],
      default: "local",
    },
    account_type: { type: String, enum: ["student", "teacher"], default: null },
    
    // ✅ UPDATED: Stripe subscription fields
    subscription_status: { 
      type: String, 
      enum: ['inactive', 'trialing', 'active', 'canceled', 'past_due'],
      default: 'inactive' 
    },
    subscription_tier: { 
      type: String, 
      enum: ['basic', 'premium'],
      default: 'basic' 
    },
    stripe_customer_id: { type: String, default: null },
    subscription_id: { type: String, default: null },
    
    // Verification
    verificationCode: { type: String },
    verificationCodeExpires: { type: Date },
    
    // User info
    name: { type: String, default: "" },
    initials: { type: String, default: "" },
  },
  { timestamps: true }
);

/**
 * SINGLE PRE-SAVE HOOK
 * Handles password hashing and initials generation in one go.
 */
userSchema.pre("save", async function () {
  // 1. Hash password if modified
  if (this.isModified("password") && this.password) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    console.log(`🔐 Password hashed for: ${this.email}`);
  }

  // 2. Generate initials if name is present
  if (this.name && (this.isModified("name") || !this.initials)) {
    this.initials = this.name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 3);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// ✅ NEW: Virtual property to check if user has active subscription
userSchema.virtual('hasActiveSubscription').get(function() {
  return this.subscription_status === 'active' || this.subscription_status === 'trialing';
});

export default mongoose.models.User || mongoose.model("User", userSchema);