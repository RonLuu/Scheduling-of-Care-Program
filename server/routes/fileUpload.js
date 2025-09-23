// /routes/fileUpload.js
import { Router } from "express";
import { fileURLToPath } from "url";
import FileUpload from "../models/FileUpload.js";
import CareTask from "../models/CareTask.js";
import CareNeedItem from "../models/CareNeedItem.js";
import PersonWithNeeds from "../models/PersonWithNeeds.js";
import ReceiptBucket from "../models/ReceiptBucket.js";
import { requireAuth, ensureCanWorkOnTask } from "../middleware/authz.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { deleteUploadBlob } from "../utils/deleteUploadBlob.js";

const router = Router();

// storage root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_DIR = path.join(__dirname, "..", "public", "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
console.log("[UPLOAD] Root folder:", UPLOAD_DIR);

// ---- helpers ----
const folderForScope = (scope) => {
  if (scope === "CareTask") return "CareTask";
  if (scope === "CareNeedItem") return "CareNeedItem";
  if (scope === "Shared") return "Shared";
  return "General";
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const scope = req.body.scope || "General";
    const dir = path.join(UPLOAD_DIR, folderForScope(scope));
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const safeBase = path
      .basename(file.originalname)
      .replace(/[^a-zA-Z0-9._-]/g, "_");
    const unique = `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}-${safeBase}`;
    cb(null, unique);
  },
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const ok = /^(image\/|application\/pdf)/.test(file.mimetype);
    cb(ok ? null : new Error("UNSUPPORTED_FILE_TYPE"), ok);
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// ============ Basic listing ============
// GET /api/file-upload?scope=CareTask&targetId=...
router.get("/", requireAuth, async (req, res) => {
  try {
    const { scope, targetId, uploadedByUserId } = req.query;
    const filter = {};
    if (scope) filter.scope = scope;
    if (targetId) filter.targetId = targetId;
    if (uploadedByUserId) filter.uploadedByUserId = uploadedByUserId;

    const files = await FileUpload.find(filter).lean();
    res.json(files);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ============ Link-based upload (JSON) ============
// POST /api/file-upload
router.post("/", requireAuth, async (req, res) => {
  try {
    let {
      scope,
      targetId,
      filename,
      fileType,
      urlOrPath,
      size,
      description,

      // legacy support:
      careTaskId,
    } = req.body;

    // Normalize legacy payload
    if (!scope && careTaskId) {
      scope = "CareTask";
      targetId = careTaskId;
    }

    if (!scope) {
      return res.status(400).json({ error: "MISSING_SCOPE" });
    }
    if (!targetId) {
      return res.status(400).json({ error: "MISSING_TARGET_ID" });
    }
    if (!filename || !urlOrPath) {
      return res.status(400).json({ error: "MISSING_FILENAME_OR_URL" });
    }

    // Guard per scope
    if (scope === "CareTask") {
      // Make sure targetId is a valid CareTask
      const task = await CareTask.findById(targetId);
      if (!task) return res.status(400).json({ error: "INVALID_TASK" });
      const access = await ensureCanWorkOnTask(req.user, task);
      if (!access.ok) return res.status(403).json({ error: access.code });
    } else if (scope === "CareNeedItem") {
      // Optional sanity check so we don’t attach to a non-existent item
      const item = await CareNeedItem.findById(targetId).select(
        "_id organizationId"
      );
      if (!item)
        return res.status(400).json({ error: "INVALID_CARE_NEED_ITEM" });
      if (String(item.organizationId) !== String(req.user.organizationId)) {
        return res.status(403).json({ error: "ORG_SCOPE_INVALID" });
      }
    }

    const doc = await FileUpload.create({
      scope,
      targetId,
      uploadedByUserId: req.user.id || req.user._id,
      filename,
      fileType,
      urlOrPath,
      size,
      description,
    });

    if (scope === "CareNeedItem") {
      await CareNeedItem.updateOne(
        { _id: targetId },
        { $addToSet: { files: doc._id } }
      );
    }

    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ============ Binary upload (multipart) ============
// POST /api/file-upload/upload
// fields: scope, targetId (when scope != Shared), description
// when scope=Shared:
//   - either pass bucketId, OR pass personId+year+month (bucket will be upserted)
router.post("/upload", requireAuth, (req, res) => {
  upload.single("file")(req, res, async (err) => {
    try {
      if (err) return res.status(400).json({ error: err.message });

      let {
        scope,
        targetId,
        description,
        bucketId,
        personId,
        year,
        month,
        effectiveDate,
      } = req.body;

      if (!scope) return res.status(400).json({ error: "MISSING_SCOPE" });

      // Resolve bucket if Shared
      if (scope === "Shared") {
        if (!bucketId) {
          if (!personId || !year || !month) {
            return res.status(400).json({ error: "MISSING_BUCKET_PARAMS" });
          }
          let bucket = await ReceiptBucket.findOne({
            personId,
            year: Number(year),
            month: Number(month),
          });
          if (!bucket) {
            const label = new Date(
              Number(year),
              Number(month) - 1
            ).toLocaleString("en-AU", { month: "long", year: "numeric" });
            bucket = await ReceiptBucket.create({
              personId,
              year: Number(year),
              month: Number(month),
              title: `Receipts ${label}`,
            });
          }
          bucketId = String(bucket._id);
        }

        const d = new Date(effectiveDate);
        if (
          d.getFullYear() !== Number(year) ||
          d.getMonth() + 1 !== Number(month)
        ) {
          return res
            .status(400)
            .json({ error: "EFFECTIVE_DATE_OUTSIDE_BUCKET" });
        }
        // For Shared, targetId is the bucket id
        targetId = bucketId;
      }

      if (!targetId) {
        return res.status(400).json({ error: "MISSING_TARGET_ID" });
      }
      if (!req.file) return res.status(400).json({ error: "NO_FILE" });

      // CareTask access check
      if (scope === "CareTask") {
        const task = await CareTask.findById(targetId);
        if (!task) return res.status(400).json({ error: "INVALID_TASK" });
        const access = await ensureCanWorkOnTask(req.user, task);
        if (!access.ok) return res.status(403).json({ error: access.code });
      }

      const publicUrl = `/uploads/${folderForScope(scope)}/${
        req.file.filename
      }`;
      console.log("[UPLOAD] Saved:", req.file.path, "->", publicUrl);

      const doc = await FileUpload.create({
        scope,
        targetId,
        bucketId: scope === "Shared" ? targetId : undefined,
        uploadedByUserId: req.user.id || req.user._id,
        filename: req.file.originalname,
        fileType: req.file.mimetype,
        urlOrPath: publicUrl,
        size: req.file.size,
        description: description || undefined,
        effectiveDate: effectiveDate ? new Date(effectiveDate) : undefined,
      });

      if (scope === "CareNeedItem") {
        await CareNeedItem.updateOne(
          { _id: targetId },
          { $addToSet: { files: doc._id } }
        );
      }

      res.status(201).json(doc);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });
});

// ============ Buckets (person-scoped) ============

// POST /api/file-upload/buckets/upsert { personId, year, month, title?, notes? }
router.post("/buckets/upsert", requireAuth, async (req, res) => {
  try {
    const { personId, year, month, title, notes } = req.body;
    if (!personId || !year || !month) {
      return res.status(400).json({ error: "MISSING_PERSON_YEAR_MONTH" });
    }
    let bucket = await ReceiptBucket.findOne({ personId, year, month });
    if (!bucket) {
      const label =
        title ||
        `Receipts ${new Date(Number(year), Number(month) - 1).toLocaleString(
          "en-AU",
          { month: "long", year: "numeric" }
        )}`;
      bucket = await ReceiptBucket.create({
        personId,
        year,
        month,
        title: label,
        notes,
      });
    } else if (title || notes) {
      bucket.title = title ?? bucket.title;
      bucket.notes = notes ?? bucket.notes;
      await bucket.save();
    }
    res.json(bucket);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// GET /api/file-upload/buckets?personId=...&year=...&month=...
router.get("/buckets", requireAuth, async (req, res) => {
  try {
    const { personId, year, month } = req.query;
    if (!personId || !year || !month) {
      return res.status(400).json({ error: "MISSING_PERSON_YEAR_MONTH" });
    }
    const bucket = await ReceiptBucket.findOne({
      personId,
      year: Number(year),
      month: Number(month),
    });
    if (!bucket) return res.json({ bucket: null, files: [] });
    const files = await FileUpload.find({
      scope: "Shared",
      targetId: bucket._id,
      bucketId: bucket._id,
    })
      .sort({ effectiveDate: -1, createdAt: -1 })
      .lean();
    res.json({ bucket, files });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ============ Reference a shared file to a care-need item ============
// POST /api/file-upload/shared/reference  { careNeedItemId, fileId }
router.post("/shared/reference", requireAuth, async (req, res) => {
  try {
    const { careNeedItemId, fileId } = req.body;
    const f = await FileUpload.findById(fileId);
    if (!f || f.scope !== "Shared")
      return res.status(400).json({ error: "NOT_A_SHARED_FILE" });

    // push fileId into care-need item's fileRefs
    await CareNeedItem.updateOne(
      { _id: careNeedItemId },
      { $addToSet: { fileRefs: f._id } }
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Returns the list of care-need items that reference the given file
router.get("/:fileId/references", requireAuth, async (req, res) => {
  try {
    const { fileId } = req.params;

    // Only check references for existing file
    const fileDoc = await FileUpload.findById(fileId).lean();
    if (!fileDoc) return res.status(404).json({ error: "Not found" });

    // Which items reference this file?
    const items = await CareNeedItem.find({ fileRefs: fileId })
      .select("_id name personId")
      .lean();

    // Optional: populate person names for nicer UI
    const personIds = [...new Set(items.map((i) => String(i.personId)))];
    const personsById = {};
    if (personIds.length) {
      const ppl = await PersonWithNeeds.find({ _id: { $in: personIds } })
        .select("_id name")
        .lean();
      for (const p of ppl) personsById[String(p._id)] = p.name || "";
    }

    const payload = items.map((i) => ({
      _id: i._id,
      name: i.name,
      personId: i.personId,
      personName: personsById[String(i.personId)] || null,
    }));

    res.json({ count: payload.length, items: payload });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ============ Files for a care-need item (direct + shared refs) ============
// GET /api/file-upload/by-care-need-item/:id
router.get("/by-care-need-item/:id", requireAuth, async (req, res) => {
  try {
    const itemId = req.params.id;

    const item = await CareNeedItem.findById(itemId).select("fileRefs").lean();
    if (!item)
      return res.status(404).json({ error: "CARE_NEED_ITEM_NOT_FOUND" });

    const direct = await FileUpload.find({
      scope: "CareNeedItem",
      targetId: itemId,
    }).lean();
    const refs = item.fileRefs?.length
      ? await FileUpload.find({ _id: { $in: item.fileRefs } }).lean()
      : [];

    const all = [...direct, ...refs].sort(
      (a, b) => new Date(b.effectiveDate) - new Date(a.effectiveDate)
    );
    res.json(all);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ============ Read/Update/Delete ============
router.get("/:fileId", requireAuth, async (req, res) => {
  const f = await FileUpload.findById(req.params.fileId).lean();
  if (!f) return res.status(404).json({ error: "Not found" });
  res.json(f);
});

router.put("/:fileId", requireAuth, async (req, res) => {
  const updated = await FileUpload.findByIdAndUpdate(
    req.params.fileId,
    req.body,
    { new: true, runValidators: true }
  );
  if (!updated) return res.status(404).json({ error: "Not found" });
  res.json(updated);
});

router.delete("/:fileId", requireAuth, async (req, res) => {
  try {
    const doc = await FileUpload.findById(req.params.fileId);
    if (!doc) return res.status(404).json({ error: "Not found" });

    // Only the uploader or Admin can delete
    const requesterId = String(req.user.id || req.user._id);
    const isOwner = String(doc.uploadedByUserId) === requesterId;
    const isAdmin = req.user.role === "Admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: "FORBIDDEN" });
    }

    // If this is a Shared receipt, remove references from CareNeedItem.fileRefs
    if (doc.scope === "Shared") {
      await CareNeedItem.updateMany(
        { fileRefs: doc._id },
        { $pull: { fileRefs: doc._id } }
      );
    }

    // best effort remove blob
    await deleteUploadBlob(doc.urlOrPath);

    await FileUpload.deleteOne({ _id: doc._id });

    res.json({
      message: "File deleted",
      removedFromItems: doc.scope === "Shared",
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
