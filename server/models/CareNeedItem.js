import { Schema, model } from "mongoose";

/**
 * CareNeedItem: plan/template for recurring or one-off care.
 * - organizationId is derived from Person (must match on create/update)
 * - No approval fields (out of scope).
 */

const TimeWindowSchema = new Schema(
  {
    startTime: { type: String, match: /^[0-2]\d:[0-5]\d$/ }, // "HH:mm" 24h
    endTime: { type: String, match: /^[0-2]\d:[0-5]\d$/ }, // "HH:mm"
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
    }, // mirror Person.organizationId

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

    // Schedule mode for each occurrence
    scheduleType: {
      type: String,
      enum: ["AllDay", "Timed"],
      default: "AllDay",
    },
    timeWindow: { type: TimeWindowSchema, default: undefined }, // required if scheduleType==="Timed"

    endDate: { type: Date }, // stop on/before this date
    occurrenceCount: { type: Number }, // or stop after N occurrences (incl. start)

    nextDueDate: { type: Date, index: true },
    category: {
      type: String,
      enum: ["HygieneProducts", "Clothing", "Health", "Entertainment", "Other"],
      required: true,
    },

    // Expected costs
    budgetCost: { type: Number, default: 0 }, // estimated budget per year
    purchaseCost: { type: Number, default: 0 }, // one-off when purchase
    occurrenceCost: { type: Number, default: 0 }, // per generated occurrence

    category: { type: String, required: true, trim: true },

    createdByUserId: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

CareNeedItemSchema.index({ organizationId: 1, nextDueDate: 1 });

export default model("CareNeedItem", CareNeedItemSchema);
