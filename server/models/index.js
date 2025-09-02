import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();
const { MONGODB_URI } = process.env;
mongoose.set("debug", true);

export const connectDB = async () => {
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not set in .env");
  }
  mongoose.set("debug", true); 
  await mongoose.connect(MONGODB_URI);
  console.log("MongoDB connected successfully");
};

// export { default as Organization } from "./Organization.js";
// export { default as User } from "./User.js";
// export { default as PersonWithNeeds } from "./PersonWithNeeds.js";
// export { default as PersonUserLink } from "./PersonUserLink.js";
export {mongoose}