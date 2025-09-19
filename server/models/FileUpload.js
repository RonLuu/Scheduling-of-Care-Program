import { Schema, model } from "mongoose";

const FileUploadSchema = new Schema(
  {
    scope: {
      type: String,
      enum: ["CareTask", "CareNeedItem", "Shared"],
      required: true,
      index: true,
    },
    targetId: { type: Schema.Types.ObjectId, required: true, index: true }, // _id of the task/item/bucket

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
    urlOrPath: { type: String, required: true }, // /uploads/…
    size: { type: Number },
    description: { type: String },
  },
  { timestamps: true }
);

FileUploadSchema.index({ scope: 1, targetId: 1, createdAt: 1 });

export default model("FileUpload", FileUploadSchema);
