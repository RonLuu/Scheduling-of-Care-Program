// models/PersonUserLink.js
import { Schema, model } from "mongoose";

/**
 * Typed many-to-many: who supports whom.
 * Invariant: User.organizationId == Person.organizationId for active links.
 */
const PersonUserLinkSchema = new Schema(
  {
    personId: {
      type: Schema.Types.ObjectId,
      ref: "PersonWithNeeds",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    relationshipType: {
      type: String,
      enum: ["GeneralCareStaff", "Admin", "Family", "PoA"],
      required: true,
      index: true,
    },

    active: { type: Boolean, default: true, index: true },
    startAt: { type: Date },
    endAt: { type: Date },
    notes: { type: String },
  },
  { timestamps: true }
);

PersonUserLinkSchema.index({ personId: 1, userId: 1 }, { unique: true });
PersonUserLinkSchema.index({ personId: 1, relationshipType: 1, active: 1 });
PersonUserLinkSchema.index({ userId: 1, active: 1 });

export default model("PersonUserLink", PersonUserLinkSchema);
