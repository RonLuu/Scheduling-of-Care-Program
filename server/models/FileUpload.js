import { Schema, model } from "mongoose";

const FileUploadSchema = new Schema(
  {
    scope: {
      type: String,
      enum: ["CareTask", "CareNeedItem", "Shared", "UserProfile"],
      required: true,
      index: true,
    },
    targetId: { type: Schema.Types.ObjectId, required: true, index: true }, // _id of the task/item/bucket/user

    // When scope === "Shared"
    bucketId: {
      type: Schema.Types.ObjectId,
      ref: "ReceiptBucket",
      index: true,
    },

    uploadedByUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    filename: { type: String, required: true },
    fileType: { type: String },
    urlOrPath: { type: String, required: true }, // /uploads/… or cloudinary URL
    size: { type: Number },
    description: { type: String },
    effectiveDate: { type: Date },
  },
  { timestamps: true }
);

FileUploadSchema.index({ scope: 1, targetId: 1, createdAt: 1 });
FileUploadSchema.index({ scope: 1, bucketId: 1, effectiveDate: -1 });

export default model("FileUpload", FileUploadSchema);
