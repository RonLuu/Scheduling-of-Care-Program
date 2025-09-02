import { Schema, model } from "mongoose";

const OrganizationSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String },
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

OrganizationSchema.index({ name: 1 });

export default model("Organization", OrganizationSchema);