// server/models/AccessRequest.js
import { Schema, model } from "mongoose";

const AccessRequestSchema = new Schema(
  {
    // who is asking
    requesterId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    requesterEmail: String,
    requesterRole: {
      type: String,
      enum: ["GeneralCareStaff", "Family", "PoA", "Admin"],
      required: true,
    },

    // token it was based on (we store the token doc id after verification)
    tokenId: {
      type: Schema.Types.ObjectId,
      ref: "Token",
      required: true,
      index: true,
    },
    tokenType: {
      type: String,
      enum: ["FAMILY_TOKEN", "MANAGER_TOKEN", "STAFF_TOKEN"],
      required: true,
    },

    // scope derived from the token
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      index: true,
    },
    personIds: [
      { type: Schema.Types.ObjectId, ref: "PersonWithNeeds", required: true },
    ],

    // who can approve (the token issuer)
    issuerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    message: String,

    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
      index: true,
    },
    decidedAt: Date,
    decidedBy: { type: Schema.Types.ObjectId, ref: "User" }, // issuer who clicked approve/reject
  },
  { timestamps: true }
);

AccessRequestSchema.index({ issuerId: 1, status: 1, createdAt: -1 });
AccessRequestSchema.index(
  { requesterId: 1, tokenId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "Pending" } }
);

export default model("AccessRequest", AccessRequestSchema);
