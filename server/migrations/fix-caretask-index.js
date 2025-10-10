// Migration script to fix the CareTask unique index
// Run this once to drop the old index and let Mongoose create the new one

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/test";

async function migrate() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected!");

    const db = mongoose.connection.db;
    const collection = db.collection("caretasks");

    console.log("Dropping old careNeedItemId_1_dueDate_1 index...");
    try {
      await collection.dropIndex("careNeedItemId_1_dueDate_1");
      console.log("✓ Old index dropped successfully");
    } catch (err) {
      if (err.code === 27) {
        console.log("⚠ Index doesn't exist, skipping drop");
      } else {
        throw err;
      }
    }

    console.log("\nCreating new partial index...");
    await collection.createIndex(
      { careNeedItemId: 1, dueDate: 1 },
      {
        unique: true,
        partialFilterExpression: { careNeedItemId: { $type: "objectId" } },
        name: "careNeedItemId_1_dueDate_1"
      }
    );
    console.log("✓ New partial index created successfully");

    console.log("\n✅ Migration completed!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

migrate();
