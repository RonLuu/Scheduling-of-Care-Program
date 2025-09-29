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

    // Shift type - predefined or custom
    shiftType: {
      type: String,
      enum: ["morning", "afternoon", "evening", "custom"],
      default: "custom",
    },

    // Start and end times (can span multiple days for custom shifts)
    start: { type: Date, required: true },
    end: { type: Date, required: true },

    // Optional notes for the shift
    notes: { type: String },

    // Track who created the shift
    createdByUserId: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Indexes for efficient querying
ShiftAllocationSchema.index({ personId: 1, start: 1, end: 1 });
ShiftAllocationSchema.index({ staffUserId: 1, start: 1 });
ShiftAllocationSchema.index({ organizationId: 1, shiftType: 1 });

// Virtual to check if shift is overnight
ShiftAllocationSchema.virtual("isOvernight").get(function () {
  if (!this.start || !this.end) return false;
  const startDay = this.start.toDateString();
  const endDay = this.end.toDateString();
  return startDay !== endDay;
});

// Method to get shift duration in hours
ShiftAllocationSchema.methods.getDurationHours = function () {
  if (!this.start || !this.end) return 0;
  const diff = this.end.getTime() - this.start.getTime();
  return diff / (1000 * 60 * 60); // Convert milliseconds to hours
};

export default model("ShiftAllocation", ShiftAllocationSchema);
