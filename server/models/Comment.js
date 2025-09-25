import { Schema, model } from "mongoose";

const CommentSchema = new Schema(
  {
    careTaskId: {
      type: Schema.Types.ObjectId,
      ref: "CareTask",
      index: true,
    },
    careNeedItemId: {
      type: Schema.Types.ObjectId,
      ref: "CareNeedItem",
      index: true,
    },
    authorUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    text: { type: String, required: true, trim: true },
    edited: { type: Boolean, default: false },
    editedAt: { type: Date },
  },
  { timestamps: true }
);

// At least one scope must exist
CommentSchema.pre("validate", function (next) {
  if (!this.careTaskId && !this.careNeedItemId) {
    return next(
      new Error("Comment must reference either a task or a care need item")
    );
  }
  next();
});

CommentSchema.index({ careTaskId: 1, createdAt: 1 });
CommentSchema.index({ careNeedItemId: 1, createdAt: 1 });

export default model("Comment", CommentSchema);
