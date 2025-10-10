// Permanently drop the problematic index
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/test";

async function dropIndexPermanently() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected!");

    const db = mongoose.connection.db;
    const collection = db.collection("caretasks");

    console.log("\n=== BEFORE ===");
    const beforeIndexes = await collection.indexes();
    beforeIndexes.forEach(idx => {
      if (idx.name === "careNeedItemId_1_dueDate_1") {
        console.log("Found index:", idx.name);
        console.log("  Unique:", idx.unique);
        console.log("  Keys:", JSON.stringify(idx.key));
      }
    });

    console.log("\nDropping careNeedItemId_1_dueDate_1...");
    try {
      await collection.dropIndex("careNeedItemId_1_dueDate_1");
      console.log("✓ Dropped");
    } catch (err) {
      console.log("Error:", err.message);
    }

    console.log("\n=== AFTER ===");
    const afterIndexes = await collection.indexes();
    const stillExists = afterIndexes.find(idx => idx.name === "careNeedItemId_1_dueDate_1");
    if (stillExists) {
      console.log("❌ Index still exists!");
      console.log(JSON.stringify(stillExists, null, 2));
    } else {
      console.log("✅ Index successfully removed");
    }

    console.log("\nAll remaining indexes:");
    afterIndexes.forEach(idx => console.log("  -", idx.name));

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\nDisconnected");
  }
}

dropIndexPermanently();
