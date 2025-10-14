// CareTask.js
import { Schema, model } from "mongoose";

// Helper to round monetary values to 2 decimal places
function roundToTwoDecimals(value) {
  if (value === null || value === undefined) return value;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * CareTask: a scheduled/instantiated occurrence from a CareNeedItem.
 * - No verification/approvals.
 */
const CareTaskSchema = new Schema(
  {
    personId: {
      type: Schema.Types.ObjectId,
      ref: "PersonWithNeeds",
      required: true,
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      index: true,
    }, // mirror Person.organizationId

    careNeedItemId: {
      type: Schema.Types.ObjectId,
      ref: "CareNeedItem",
      required: false,
      index: true,
    },

    title: { type: String, required: true, trim: true },
    dueDate: { type: Date, index: true },

    // Schedule mode
    scheduleType: {
      type: String,
      enum: ["AllDay", "Timed"],
      default: "AllDay",
      required: true,
    },
    startAt: { type: Date }, // set if Timed
    endAt: { type: Date }, // set if Timed

    status: {
      type: String,
      enum: [
        "Scheduled",
        "Completed",
        "Missed",
        "Skipped",
        "Cancelled",
        "Returned",
      ],
      default: "Scheduled",
      index: true,
    },

    assignedToUserId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    completedByUserId: { type: Schema.Types.ObjectId, ref: "User" },
    completedAt: { type: Date },

    // Budget tracking fields
    budgetCategoryId: {
      type: String, // Category uses string ID in BudgetPlan schema
      required: false,
      index: true,
    },
    budgetItemId: {
      type: Schema.Types.ObjectId, // Items have MongoDB ObjectIds
      required: false,
      index: true,
    },
    expectedCost: {
      type: Number,
      set: roundToTwoDecimals, // Round on save
    }, // Expected/planned cost

    // Actual spend recorded when completed
    cost: {
      type: Number,
      set: roundToTwoDecimals, // Round on save
    },

    // File references to shared receipts from ReceiptBuckets
    fileRefs: [{ type: Schema.Types.ObjectId, ref: "FileUpload", index: true }],
  },
  { timestamps: true }
);

// CareTaskSchema.index({ organizationId: 1, status: 1, dueDate: 1 });
// CareTaskSchema.index({ assignedToUserId: 1, dueDate: 1 });
// Note: careNeedItemId + dueDate index removed to allow multiple tasks on same date
// If you need it for performance, add it manually without unique constraint

export default model("CareTask", CareTaskSchema);
