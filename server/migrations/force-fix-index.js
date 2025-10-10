// Force drop and recreate the careNeedItemId_dueDate index
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/test";

async function forceFixIndex() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected!");

    const db = mongoose.connection.db;
    const collection = db.collection("caretasks");

    // Get all indexes
    const indexes = await collection.indexes();
    console.log("\nCurrent indexes:");
    indexes.forEach(idx => console.log(`  - ${idx.name}`));

    // Drop the careNeedItemId_1_dueDate_1 index
    console.log("\nDropping careNeedItemId_1_dueDate_1 index...");
    try {
      await collection.dropIndex("careNeedItemId_1_dueDate_1");
      console.log("✓ Index dropped");
    } catch (err) {
      console.log("⚠ Error dropping:", err.message);
    }

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Create the new partial index
    console.log("\nCreating new partial index...");
    await collection.createIndex(
      { careNeedItemId: 1, dueDate: 1 },
      {
        unique: true,
        partialFilterExpression: {
          careNeedItemId: { $exists: true, $type: "objectId" }
        },
        name: "careNeedItemId_1_dueDate_1"
      }
    );
    console.log("✓ New partial index created");

    // Verify
    const newIndexes = await collection.indexes();
    const targetIndex = newIndexes.find(idx => idx.name === "careNeedItemId_1_dueDate_1");

    console.log("\n✅ Final index configuration:");
    console.log("   Name:", targetIndex.name);
    console.log("   Keys:", JSON.stringify(targetIndex.key));
    console.log("   Unique:", targetIndex.unique);
    console.log("   PartialFilter:", JSON.stringify(targetIndex.partialFilterExpression));

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB");
  }
}

forceFixIndex();
