import { Schema, model } from "mongoose";

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
      required: true,
      index: true,
    }, // mirror Person.organizationId

    careNeedItemId: {
      type: Schema.Types.ObjectId,
      ref: "CareNeedItem",
      required: true,
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
      enum: ["Scheduled", "Completed", "Missed", "Skipped", "Cancelled"],
      default: "Scheduled",
      index: true,
    },

    assignedToUserId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    completedByUserId: { type: Schema.Types.ObjectId, ref: "User" },
    completedAt: { type: Date },

    // Actual spend recorded when completed
    cost: { type: Number },
  },
  { timestamps: true }
);

CareTaskSchema.index({ organizationId: 1, status: 1, dueDate: 1 });
CareTaskSchema.index({ assignedToUserId: 1, dueDate: 1 });
CareTaskSchema.index({ careNeedItemId: 1, dueDate: 1 }, { unique: true });

export default model("CareTask", CareTaskSchema);
