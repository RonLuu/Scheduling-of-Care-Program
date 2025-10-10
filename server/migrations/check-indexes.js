// Script to check current indexes on caretasks collection
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/test";

async function checkIndexes() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected!");

    const db = mongoose.connection.db;
    const collection = db.collection("caretasks");

    console.log("\nCurrent indexes on caretasks collection:");
    const indexes = await collection.indexes();
    indexes.forEach((index, i) => {
      console.log(`\n${i + 1}. ${index.name}`);
      console.log("   Keys:", JSON.stringify(index.key));
      if (index.unique) console.log("   Unique: true");
      if (index.sparse) console.log("   Sparse: true");
      if (index.partialFilterExpression) {
        console.log("   PartialFilter:", JSON.stringify(index.partialFilterExpression));
      }
    });
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await mongoose.disconnect();
  }
}

checkIndexes();
