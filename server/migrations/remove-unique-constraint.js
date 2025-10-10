// Remove the unique constraint from careNeedItemId_dueDate index
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/test";

async function removeUniqueConstraint() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected!");

    const db = mongoose.connection.db;
    const collection = db.collection("caretasks");

    console.log("\nDropping careNeedItemId_1_dueDate_1 index (with unique constraint)...");
    try {
      await collection.dropIndex("careNeedItemId_1_dueDate_1");
      console.log("✓ Old unique index dropped");
    } catch (err) {
      if (err.code === 27) {
        console.log("⚠ Index doesn't exist");
      } else {
        throw err;
      }
    }

    console.log("\nCreating new non-unique index for performance...");
    await collection.createIndex(
      { careNeedItemId: 1, dueDate: 1 },
      { name: "careNeedItemId_1_dueDate_1" }
    );
    console.log("✓ New non-unique index created");

    console.log("\n✅ Migration completed!");
    console.log("You can now create multiple tasks on the same date.");

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB");
  }
}

removeUniqueConstraint();
