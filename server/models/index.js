import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const mongoUri =
  process.env.NODE_ENV === "production"
    ? process.env.MONGODB_URI
    : process.env.MONGODB_URI_LOCAL || process.env.MONGODB_URI;

export const connectDB = async () => {
  if (!mongoUri) {
    throw new Error("MongoDB connection string is not set");
  }
  await mongoose.connect(mongoUri, { autoIndex: false });
  console.log("MongoDB connected successfully");
};

export { mongoose };
