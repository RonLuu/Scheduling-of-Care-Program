import { Schema, model } from "mongoose";

const TimeWindowSchema = new Schema(
  {
    startTime: { type: String, match: /^[0-2]\d:[0-5]\d$/ },
    endTime: { type: String, match: /^[0-2]\d:[0-5]\d$/ },
  },
  { _id: false }
);

const YearBudgetSchema = new Schema(
  {
    year: { type: Number, required: true }, // e.g., 2025
    amount: { type: Number, default: 0 }, // annual budget for that year
  },
  { _id: false }
);

const CareNeedItemSchema = new Schema(
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

    name: { type: String, required: true, trim: true },
    description: { type: String },

    frequency: {
      intervalType: {
        type: String,
        enum: [
          "JustPurchase",
          "OneTime",
          "Daily",
          "Weekly",
          "Monthly",
          "Yearly",
        ],
        required: true,
      },
      intervalValue: { type: Number, default: 1 },
      startDate: { type: Date },
    },

    scheduleType: {
      type: String,
      enum: ["AllDay", "Timed"],
      default: "AllDay",
    },
    timeWindow: { type: TimeWindowSchema, default: undefined },

    endDate: { type: Date },
    occurrenceCount: { type: Number },

    nextDueDate: { type: Date, index: true },

    category: { type: String, required: true, trim: true },

    // Budgets / costs
    budgetCost: { type: Number, default: 0 }, //  default annual budget

    // actual per-year budgets
    budgets: { type: [YearBudgetSchema], default: [] },

    purchaseCost: { type: Number, default: 0 }, // one-off spent at purchase
    occurrenceCost: { type: Number, default: 0 }, // per generated occurrence

    // attachments
    files: [{ type: Schema.Types.ObjectId, ref: "FileUpload", index: true }], // direct uploads to this item
    fileRefs: [{ type: Schema.Types.ObjectId, ref: "FileUpload", index: true }], // references to bucket files

    status: {
      type: String,
      enum: ["Active", "Returned"],
      default: "Active",
    },

    createdByUserId: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Avoid duplicate year rows in a single doc
CareNeedItemSchema.pre("save", function (next) {
  if (this.budgets && this.budgets.length > 1) {
    const seen = new Set();
    this.budgets = this.budgets.filter((b) => {
      const k = String(b.year);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }
  next();
});

CareNeedItemSchema.index({ organizationId: 1, nextDueDate: 1 });

export default model("CareNeedItem", CareNeedItemSchema);
