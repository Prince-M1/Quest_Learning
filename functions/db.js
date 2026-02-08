import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

export const connectDB = async () => {
  try {
    // If we're already connected, return the native db
    if (mongoose.connection.readyState === 1) {
      return mongoose.connection.db;
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Mongoose connected to MongoDB Atlas");
    return mongoose.connection.db;
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  }
};