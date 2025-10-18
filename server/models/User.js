import { Schema, model } from "mongoose";

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

    // Profile image reference
    avatarFileId: {
      type: Schema.Types.ObjectId,
      ref: "FileUpload",
      default: null,
    },

    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
    
    // Email notification preferences
    emailPreferences: {
      budgetAlerts: { type: Boolean, default: true },
      budgetThreshold: { type: Number, default: 80, min: 0, max: 100 }, // Percentage threshold for budget alerts
      taskReminders: { type: Boolean, default: true },
      weeklyReports: { type: Boolean, default: false },
      lastBudgetAlertSent: { type: Map, of: Date }, // Track last alert per client/category to avoid spam
    },
  },
  { timestamps: true }
);

UserSchema.index({ organizationId: 1, role: 1 });
export default model("User", UserSchema);
