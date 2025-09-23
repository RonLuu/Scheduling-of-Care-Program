import { Router } from "express";
import Comment from "../models/Comment.js";
import CareTask from "../models/CareTask.js";
import CareNeedItem from "../models/CareNeedItem.js";
import {
  requireAuth,
  ensureCanWorkOnTask,
  ensureCanManagePerson,
} from "../middleware/authz.js";

const router = Router();

router.get("/", requireAuth, listComments);
router.post("/", requireAuth, createComment);
router.get("/:commentId", requireAuth, getComment);
router.put("/:commentId", requireAuth, updateComment);
router.delete("/:commentId", requireAuth, deleteComment);

async function listComments(req, res) {
  const { careTaskId, careNeedItemId, authorUserId } = req.query;
  const filter = {};
  if (careTaskId) filter.careTaskId = careTaskId;
  if (careNeedItemId) filter.careNeedItemId = careNeedItemId;
  if (authorUserId) filter.authorUserId = authorUserId;

  const comments = await Comment.find(filter)
    .sort({ createdAt: 1 })
    .populate("authorUserId", "name email")
    .lean();

  res.json(
    comments.map((c) => ({
      ...c,
      author: c.authorUserId
        ? {
            id: c.authorUserId._id,
            name: c.authorUserId.name,
            email: c.authorUserId.email,
          }
        : null,
    }))
  );
}

async function createComment(req, res) {
  const { careTaskId, careNeedItemId, text } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: "TEXT_REQUIRED" });

  if (careTaskId) {
    const task = await CareTask.findById(careTaskId);
    if (!task) return res.status(400).json({ error: "INVALID_TASK" });
    const access = await ensureCanWorkOnTask(req.user, task);
    if (!access.ok) return res.status(403).json({ error: access.code });
  } else if (careNeedItemId) {
    const item = await CareNeedItem.findById(careNeedItemId);
    if (!item) return res.status(400).json({ error: "INVALID_ITEM" });
    const perm = await ensureCanManagePerson(req.user, item.personId);
    if (!perm.ok) return res.status(403).json({ error: perm.code });
  } else {
    return res.status(400).json({ error: "MISSING_TARGET" });
  }

  const c = await Comment.create({
    careTaskId,
    careNeedItemId,
    authorUserId: req.user.id || req.user._id,
    text: text.trim(),
  });

  const populated = await Comment.findById(c._id)
    .populate("authorUserId", "name email")
    .lean();

  res.status(201).json({
    ...populated,
    author: populated.authorUserId
      ? {
          id: populated.authorUserId._id,
          name: populated.authorUserId.name,
          email: populated.authorUserId.email,
        }
      : null,
  });
}

async function getComment(req, res) {
  const c = await Comment.findById(req.params.commentId).lean();
  if (!c) return res.status(404).json({ error: "Not found" });
  res.json(c);
}

async function updateComment(req, res) {
  const existing = await Comment.findById(req.params.commentId);
  if (!existing) return res.status(404).json({ error: "Not found" });
  // Only the author (or Admin) edits — simple rule
  if (
    String(existing.authorUserId) !== String(req.user.id || req.user._id) &&
    req.user.role !== "Admin"
  ) {
    return res.status(403).json({ error: "FORBIDDEN" });
  }
  const updated = await Comment.findByIdAndUpdate(
    req.params.commentId,
    { text: req.body.text, edited: true, editedAt: new Date() },
    { new: true, runValidators: true }
  );
  res.json(updated);
}

async function deleteComment(req, res) {
  const existing = await Comment.findById(req.params.commentId);
  if (!existing) return res.status(404).json({ error: "Not found" });
  if (
    String(existing.authorUserId) !== String(req.user.id || req.user._id) &&
    req.user.role !== "Admin"
  ) {
    return res.status(403).json({ error: "FORBIDDEN" });
  }
  await Comment.deleteOne({ _id: req.params.commentId });
  res.json({ message: "Comment deleted" });
}

export default router;
