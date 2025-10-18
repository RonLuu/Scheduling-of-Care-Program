// models/User.js
import { Schema, model } from "mongoose";

const EmergencyContactSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
  },
  { _id: true }
);

const UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },

    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      index: true,
    },

    role: {
      type: String,
      enum: ["GeneralCareStaff", "Family", "PoA", "Admin"],
      required: true,
      index: true,
    },

    // Custom title for Admin users (e.g., "Manager", "Supervisor")
    title: { type: String, trim: true, default: null },

    mobile: { type: String, trim: true, default: null },
    address: { type: String, trim: true, default: null },

    // Emergency contacts array
    emergencyContacts: {
      type: [EmergencyContactSchema],
      default: [],
    },

    // Profile image reference
    avatarFileId: {
      type: Schema.Types.ObjectId,
      ref: "FileUpload",
      default: null,
    },

    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
  },
  { timestamps: true }
);

UserSchema.index({ organizationId: 1, role: 1 });
export default model("User", UserSchema);
