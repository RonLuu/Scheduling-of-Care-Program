import mongoose, { Schema, model } from "mongoose";

/**
 * Denormalize orgId on high-volume children (tasks/items) from this.
 */
const PersonWithNeedsSchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },

    name: { type: String, required: true, index: true, trim: true },
    dateOfBirth: Date,
    medicalInfo: String,

    status: {
      type: String,
      enum: ["Active", "Transferred", "Inactive"],
      default: "Active",
    },

    // Optional: current budget policy kept on the Person, reports snapshot separately
    currentAnnualBudget: { type: Number, default: 0 },

    customCategories: { type: [String], default: [] },
  },
  { timestamps: true }
);

PersonWithNeedsSchema.index({ organizationId: 1, name: 1 });

export default model("PersonWithNeeds", PersonWithNeedsSchema);
