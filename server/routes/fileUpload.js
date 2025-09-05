import { Router } from "express";
import { fileURLToPath } from "url";
import FileUpload from "../models/FileUpload.js";
import CareTask from "../models/CareTask.js";
import { requireAuth, ensureCanWorkOnTask } from "../middleware/authz.js";
import multer from "multer";
import path from "path";
import fs from "fs";


const router = Router();

router.get("/", requireAuth, listFiles);
router.post("/", requireAuth, createFile);
router.post("/upload", requireAuth, uploadFile); // real upload
router.get("/:fileId", requireAuth, getFile);
router.put("/:fileId", requireAuth, updateFile);
router.delete("/:fileId", requireAuth, deleteFile);

// storage (public/uploads)
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const UPLOAD_DIR = path.join(__dirname, "..", "public", "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
console.log("[UPLOAD] Saving files to:", UPLOAD_DIR);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    // unique: <timestamp>-<random>-<original>
    const safeBase = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, "_");
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeBase}`;
    cb(null, unique);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ok = /^(image\/|application\/pdf)/.test(file.mimetype);
    cb(ok ? null : new Error("UNSUPPORTED_FILE_TYPE"), ok);
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

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

// NEW: multipart upload (field name 'file')
// expects: form-data with fields: careTaskId, description? (optional), file (binary)
async function uploadFile(req, res) {
  upload.single("file")(req, res, async (err) => {
    try {
      if (err) return res.status(400).json({ error: err.message });
      const { careTaskId, description } = req.body;
      if (!careTaskId) return res.status(400).json({ error: "MISSING_TASK" });

      const task = await CareTask.findById(careTaskId);
      if (!task) return res.status(400).json({ error: "INVALID_TASK" });

      const access = await ensureCanWorkOnTask(req.user, task);
      if (!access.ok) return res.status(403).json({ error: access.code });

      if (!req.file) return res.status(400).json({ error: "NO_FILE" });

      // This URL must match app.use('/uploads', ...) in server/index.js
      const publicUrl = `/uploads/${req.file.filename}`;
      console.log("[UPLOAD] Saved:", req.file.path, " -> ", publicUrl);

      const doc = await FileUpload.create({
        careTaskId,
        uploadedByUserId: req.user.id || req.user._id,
        filename: req.file.originalname,
        fileType: req.file.mimetype,
        urlOrPath: publicUrl,
        size: req.file.size,
        description: description || undefined
      });

      res.status(201).json(doc);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });
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