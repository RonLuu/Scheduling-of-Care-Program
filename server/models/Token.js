import { Schema, model } from "mongoose";

const TokenSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["FAMILY_TOKEN", "MANAGER_TOKEN", "STAFF_TOKEN"],
      required: true,
    },
    tokenHash: { type: String, required: true, unique: true, index: true },

    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    personIds: [{ type: Schema.Types.ObjectId, ref: "PersonWithNeeds" }],

    issuerId: { type: Schema.Types.ObjectId, ref: "User" },
    note: String,

    expiresAt: { type: Date, required: true, index: true },
    maxUses: { type: Number, default: 1, min: 1 },
    uses: { type: Number, default: 0, min: 0 },

    revoked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

TokenSchema.index({ organizationId: 1, type: 1, expiresAt: 1 });

export default model("Token", TokenSchema);
