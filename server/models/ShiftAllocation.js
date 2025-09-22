import { Schema, model } from "mongoose";

const ShiftAllocationSchema = new Schema(
  {
    personId: {
      type: Schema.Types.ObjectId,
      ref: "PersonWithNeeds",
      required: true,
      index: true,
    },
    staffUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },

    // Shift timing
    start: { type: Date, required: true },
    end: { type: Date, required: true },

    notes: { type: String },
  },
  { timestamps: true }
);

ShiftAllocationSchema.index({ personId: 1, start: 1, end: 1 });

export default model("ShiftAllocation", ShiftAllocationSchema);
