import { Schema, model } from "mongoose";

const ReceiptBucketSchema = new Schema(
  {
    personId: {
      type: Schema.Types.ObjectId,
      ref: "PersonWithNeeds",
      required: true,
      index: true,
    },
    year: { type: Number, required: true, index: true },
    month: { type: Number, required: true, min: 1, max: 12, index: true },

    title: String, // e.g. "Receipts July 2025"
    notes: String,
  },
  { timestamps: true }
);

// Unique per person, year, month
ReceiptBucketSchema.index({ personId: 1, year: 1, month: 1 }, { unique: true });

export default model("ReceiptBucket", ReceiptBucketSchema);
