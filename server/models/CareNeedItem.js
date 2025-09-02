import { Schema, model } from "mongoose";

/**
 * CareNeedItem: plan/template for recurring or one-off care.
 * - organizationId is derived from Person (must match on create/update)
 * - No approval fields (out of scope).
 */
const CareNeedItemSchema = new Schema(
  {
    personId:       { type: Schema.Types.ObjectId, ref: "PersonWithNeeds", required: true, index: true },
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization",  required: true, index: true }, // mirror Person.organizationId

    name:        { type: String, required: true, trim: true },
    description: { type: String },

    frequency: {
      intervalType:  { type: String, enum: ["Daily","Weekly","Monthly","Yearly","OneTime"], required: true },
      intervalValue: { type: Number, default: 1 },
      startDate:     { type: Date }
    },

    endDate:       { type: Date },     // stop on/before this date
    occurrenceCount:{ type: Number },   // or stop after N occurrences (incl. start)

    nextDueDate:    { type: Date, index: true },
    category:       { type: String },

    // Expected costs
    purchaseCost:   { type: Number, default: 0 },  // one-off
    occurrenceCost: { type: Number, default: 0 },  // per generated occurrence

    status: { type: String, enum: ["Active","Suspended","Deleted"], default: "Active" },

    createdByUserId: { type: Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

CareNeedItemSchema.index({ organizationId: 1, nextDueDate: 1 });

export default model("CareNeedItem", CareNeedItemSchema);