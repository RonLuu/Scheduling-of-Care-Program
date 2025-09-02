import { Router } from "express";
import FileUpload from "../models/FileUpload.js";
import CareTask from "../models/CareTask.js";
import { requireAuth, ensureCanWorkOnTask } from "../middleware/authz.js";

const router = Router();

router.get("/", requireAuth, listFiles);
router.post("/", requireAuth, createFile);
router.get("/:fileId", requireAuth, getFile);
router.put("/:fileId", requireAuth, updateFile);
router.delete("/:fileId", requireAuth, deleteFile);

async function listFiles(req, res) {
  const { careTaskId, uploadedByUserId } = req.query;
  const filter = {};
  if (careTaskId) filter.careTaskId = careTaskId;
  if (uploadedByUserId) filter.uploadedByUserId = uploadedByUserId;
  const files = await FileUpload.find(filter).lean();
  res.json(files);
}

async function createFile(req, res) {
  const { careTaskId, filename, fileType, urlOrPath, size, description } = req.body;

  const task = await CareTask.findById(careTaskId);
  if (!task) return res.status(400).json({ error: "INVALID_TASK" });

  const access = await ensureCanWorkOnTask(req.user, task);
  if (!access.ok) return res.status(403).json({ error: access.code });

  const file = await FileUpload.create({
    careTaskId,
    uploadedByUserId: req.user.id || req.user._id,
    filename, fileType, urlOrPath, size, description
  });
  res.status(201).json(file);
}

async function getFile(req, res) {
  const f = await FileUpload.findById(req.params.fileId).lean();
  if (!f) return res.status(404).json({ error: "Not found" });
  res.json(f);
}

async function updateFile(req, res) {
  const updated = await FileUpload.findByIdAndUpdate(
    req.params.fileId,
    req.body,
    { new: true, runValidators: true }
  );
  if (!updated) return res.status(404).json({ error: "Not found" });
  res.json(updated);
}

async function deleteFile(req, res) {
  await FileUpload.deleteOne({ _id: req.params.fileId });
  res.json({ message: "File deleted" });
}

export default router;