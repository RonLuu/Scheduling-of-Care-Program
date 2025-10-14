import mongoose, { Schema, model } from "mongoose";

/**
 * Updated PersonWithNeeds schema with comprehensive medical and contact information
 */
const PersonWithNeedsSchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      index: true,
    },

    // Basic Information
    name: { type: String, required: true, index: true, trim: true },
    dateOfBirth: Date,
    mobilePhone: { type: String, trim: true },

    sex: {
      type: String,
      enum: ["", "Male", "Female", "Prefer not to say"],
      default: "",
    },

    // Address Information
    address: {
      street: { type: String, trim: true },
      suburb: { type: String, trim: true },
      state: {
        type: String,
        enum: ["", "NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"],
        default: "",
      },
      postcode: {
        type: String,
        validate: {
          validator: function (v) {
            return !v || /^\d{4}$/.test(v);
          },
          message: "Postcode must be 4 digits",
        },
      },
    },

    // Emergency Contact
    emergencyContact: {
      name: { type: String, trim: true },
      phone: { type: String, trim: true },
      relationship: { type: String, trim: true }, // Optional: relationship to client
    },

    // Comprehensive Medical Information
    medicalInfo: {
      // Core medical information
      problems: { type: String }, // Medical conditions/problems
      allergies: { type: String }, // Known allergies
      medications: { type: String }, // Current medications

      // Special needs information
      mobilityNeeds: { type: String }, // Wheelchair, walker, etc.
      communicationNeeds: { type: String }, // Sign language, speech assistance, etc.
      dietaryRequirements: { type: String }, // Special dietary needs
    },

    // Custom fields for user-defined information
    customFields: [
      {
        title: { type: String, required: true },
        value: { type: String, required: true },
        category: { type: String }, // Optional categorization
        createdAt: { type: Date, default: Date.now },
      },
    ],

    // Status and administrative
    status: {
      type: String,
      enum: ["Active", "Transferred", "Inactive", "Archived"],
      default: "Active",
    },

    // Risk assessment
    riskLevel: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Low",
    },

    riskNotes: { type: String },

    // Support requirements
    supportLevel: {
      type: String,
      enum: ["Independent", "Minimal", "Moderate", "High", "24/7"],
      default: "Moderate",
    },

    // Important dates
    assessmentDates: {
      lastAssessment: Date,
      nextScheduled: Date,
    },

    // Documents and attachments references
    documents: [
      {
        type: { type: String }, // e.g., "Care Plan", "Medical Report"
        filename: { type: String },
        uploadDate: { type: Date, default: Date.now },
        url: { type: String }, // Reference to document storage
      },
    ],

    // Notes and observations
    notes: [
      {
        content: { type: String, required: true },
        author: { type: String },
        date: { type: Date, default: Date.now },
        category: { type: String }, // e.g., "Medical", "Behavioral", "General"
      },
    ],

    // Categories for expenses (maintained from original)
    customCategories: { type: [String], default: [] },

    // Budget information (optional - can be removed if not needed)
    currentAnnualBudget: { type: Number, default: 0 },

    // Audit trail
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    lastModifiedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
  }
);

// Indexes for efficient querying
PersonWithNeedsSchema.index({ organizationId: 1, name: 1 });
PersonWithNeedsSchema.index({ organizationId: 1, status: 1 });
PersonWithNeedsSchema.index({ "emergencyContact.phone": 1 });
PersonWithNeedsSchema.index({ mobilePhone: 1 });
PersonWithNeedsSchema.index({ "address.postcode": 1 });

// Virtual for full address
PersonWithNeedsSchema.virtual("fullAddress").get(function () {
  const addr = this.address;
  if (!addr) return "";
  const parts = [addr.street, addr.suburb, addr.state, addr.postcode].filter(
    Boolean
  );
  return parts.join(", ");
});

// Virtual for age calculation
PersonWithNeedsSchema.virtual("age").get(function () {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }
  return age;
});

// Method to add a custom field
PersonWithNeedsSchema.methods.addCustomField = function (
  title,
  value,
  category = null
) {
  this.customFields.push({ title, value, category });
  return this.save();
};

// Method to add a note
PersonWithNeedsSchema.methods.addNote = function (
  content,
  author,
  category = "General"
) {
  this.notes.push({ content, author, category });
  return this.save();
};

// Pre-save middleware to validate Australian postcode
PersonWithNeedsSchema.pre("save", function (next) {
  if (this.address && this.address.postcode) {
    if (!/^\d{4}$/.test(this.address.postcode)) {
      return next(new Error("Invalid Australian postcode"));
    }
  }
  next();
});

export default model("PersonWithNeeds", PersonWithNeedsSchema);
