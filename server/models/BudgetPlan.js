import { Schema, model } from "mongoose";

const BudgetItemSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    budget: { type: Number, required: true, min: 0 },
  },
  { _id: true }
);

const BudgetCategorySchema = new Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    emoji: { type: String, default: '📋' },
    description: { type: String, trim: true },
    budget: { type: Number, required: true, min: 0 },
    isCustom: { type: Boolean, default: false },
    items: { type: [BudgetItemSchema], default: [] },
  },
  { _id: false }
);

const BudgetPlanSchema = new Schema(
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
    },
    createdByUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    year: { type: Number, required: true },
    yearlyBudget: { type: Number, required: true, min: 0 },
    categories: { type: [BudgetCategorySchema], default: [] },
    status: {
      type: String,
      enum: ["Draft", "Active", "Archived"],
      default: "Draft",
    },
  },
  { timestamps: true }
);

// Ensure only one active budget plan per person per year
BudgetPlanSchema.index(
  { personId: 1, year: 1 },
  { unique: true }
);

BudgetPlanSchema.index({ organizationId: 1, year: 1 });

export default model("BudgetPlan", BudgetPlanSchema);