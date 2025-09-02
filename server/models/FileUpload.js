import { Schema, model } from "mongoose";

const FileUploadSchema = new Schema(
  {
    careTaskId:       { type: Schema.Types.ObjectId, ref: "CareTask", required: true, index: true },
    uploadedByUserId: { type: Schema.Types.ObjectId, ref: "User",     required: true, index: true },

    filename:   { type: String, required: true },
    fileType:   { type: String },
    urlOrPath:  { type: String, required: true },
    size:       { type: Number },
    description:{ type: String }
  },
  { timestamps: true }
);

export default model("FileUpload", FileUploadSchema);