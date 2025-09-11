import { Schema, model } from "mongoose";

const CommentSchema = new Schema(
  {
    careTaskId:    { type: Schema.Types.ObjectId, ref: "CareTask", required: true, index: true },
    authorUserId:  { type: Schema.Types.ObjectId, ref: "User",     required: true, index: true },
    text:          { type: String, required: true, trim: true },
    edited:        { type: Boolean, default: false },
    editedAt:      { type: Date }
  },
  { timestamps: true }
);
CommentSchema.index({ careTaskId: 1, createdAt: 1 });

export default model("Comment", CommentSchema);