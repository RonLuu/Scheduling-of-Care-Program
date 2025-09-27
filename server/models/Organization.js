import { Schema, model } from "mongoose";

const OrganizationSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String },
    active: { type: Boolean, default: true },

    // Predefined shift configurations
    shiftSettings: {
      morning: {
        startTime: { type: String, default: "07:00" }, // 7:00 AM
        endTime: { type: String, default: "16:00" }, // 4:00 PM
        enabled: { type: Boolean, default: true },
      },
      afternoon: {
        startTime: { type: String, default: "15:30" }, // 3:30 PM
        endTime: { type: String, default: "22:00" }, // 10:00 PM
        enabled: { type: Boolean, default: true },
      },
      evening: {
        startTime: { type: String, default: "21:30" }, // 9:30 PM
        endTime: { type: String, default: "07:30" }, // 7:30 AM (next day)
        isOvernight: { type: Boolean, default: true }, // Indicates shift spans to next day
        enabled: { type: Boolean, default: true },
      },
    },
  },
  { timestamps: true }
);

OrganizationSchema.index({ name: 1 });

// Method to get shift times
OrganizationSchema.methods.getShiftTimes = function (shiftType) {
  const shifts = this.shiftSettings || {};
  const defaultShifts = {
    morning: { startTime: "07:00", endTime: "16:00", enabled: true },
    afternoon: { startTime: "15:30", endTime: "22:00", enabled: true },
    evening: {
      startTime: "21:30",
      endTime: "07:30",
      isOvernight: true,
      enabled: true,
    },
  };

  return shifts[shiftType] || defaultShifts[shiftType];
};

export default model("Organization", OrganizationSchema);
