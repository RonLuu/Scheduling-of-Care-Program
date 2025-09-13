import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();
const { MONGODB_URI } = process.env;

export const connectDB = async () => {
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not set in .env");
  }
  await mongoose.connect(MONGODB_URI);
  console.log("MongoDB connected successfully");
};

export { mongoose };
