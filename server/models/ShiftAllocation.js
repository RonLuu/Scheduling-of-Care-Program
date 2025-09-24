import { Schema, model } from "mongoose";

const ShiftAllocationSchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
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

    // all-day or timed shift
    allDay: { type: Boolean, default: false },
    start: { type: Date, required: true },
    end: { type: Date, required: true },

    notes: { type: String },

    createdByUserId: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

ShiftAllocationSchema.index({ personId: 1, start: 1, end: 1 });
ShiftAllocationSchema.index({ staffUserId: 1, start: 1 });

export default model("ShiftAllocation", ShiftAllocationSchema);
