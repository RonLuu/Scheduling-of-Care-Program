// /routes/fileUpload.js
import { Router } from "express";
import { fileURLToPath } from "url";
import FileUpload from "../models/FileUpload.js";
import CareTask from "../models/CareTask.js";
import CareNeedItem from "../models/CareNeedItem.js";
import PersonWithNeeds from "../models/PersonWithNeeds.js";
import ReceiptBucket from "../models/ReceiptBucket.js";
import User from "../models/User.js";
import { requireAuth, ensureCanWorkOnTask } from "../middleware/authz.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import busboy from "busboy";
import { deleteUploadBlob } from "../utils/deleteUploadBlob.js";

// Cloudinary import
import { configureCloudinary } from "../utils/cloudinary.js";
import { CloudinaryStorage } from "multer-storage-cloudinary";

const router = Router();

// storage root for DEV/local uploads
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_DIR = path.join(__dirname, "..", "public", "uploads");

// ---- helpers ----
const folderForScope = (scope) => {
  if (scope === "CareTask") return "CareTask";
  if (scope === "CareNeedItem") return "CareNeedItem";
  if (scope === "Shared") return "Shared";
  if (scope === "UserProfile") return "UserProfile";
  return "General";
};

const isProd = process.env.NODE_ENV === "production";

// Build a storage engine depending on environment
let storage;

if (isProd) {
  // --- PRODUCTION (Heroku) -> Cloudinary ---
  const cloudinary = configureCloudinary();
  const folderPrefix = process.env.CLOUDINARY_FOLDER_PREFIX;
  console.log("Connected to folder:", folderPrefix);

  storage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => {
      // Use a custom property we'll set before multer runs
      const scope = req._uploadScope || req.body?.scope || "General";
      const folder = `${folderPrefix}/${folderForScope(scope)}`;

      // For UserProfile, only allow images
      if (scope === "UserProfile") {
        const allowed = /^image\//.test(file.mimetype);
        if (!allowed) {
          throw new Error("PROFILE_IMAGES_ONLY");
        }
      } else {
        // limit types similar to your original filter (images + pdf)
        const allowed = /^(image\/|application\/pdf)/.test(file.mimetype);
        if (!allowed) {
          throw new Error("UNSUPPORTED_FILE_TYPE");
        }
      }

      // Set resource_type=auto to support images + pdf seamlessly
      return {
        folder,
        resource_type: "auto",
        format: undefined, // let Cloudinary infer
        public_id: undefined, // auto-generate
      };
    },
  });
} else {
  // --- DEVELOPMENT -> local disk ---
  // Use a temporary directory for initial upload, then move to correct location
  const TEMP_DIR = path.join(UPLOAD_DIR, "_temp");
  fs.mkdirSync(TEMP_DIR, { recursive: true });
  console.log("[UPLOAD] Root folder:", UPLOAD_DIR);
  console.log("[UPLOAD] Temp folder:", TEMP_DIR);

  storage = multer.diskStorage({
    destination: (req, file, cb) => {
      // Always save to temp directory initially
      // We'll move it to the correct location after we know the scope
      cb(null, TEMP_DIR);
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
}

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    // Use custom property if set, otherwise fall back to body
    const scope = req._uploadScope || req.body?.scope;

    // For UserProfile, only allow images
    if (scope === "UserProfile") {
      const ok = /^image\//.test(file.mimetype);
      cb(ok ? null : new Error("PROFILE_IMAGES_ONLY"), ok);
    } else {
      const ok = /^(image\/|application\/pdf)/.test(file.mimetype);
      cb(ok ? null : new Error("UNSUPPORTED_FILE_TYPE"), ok);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// Middleware to extract scope from body before multer processes the file
const extractScopeMiddleware = (req, res, next) => {
  // Parse form data to get scope before multer runs
  const contentType = req.headers["content-type"] || "";

  if (contentType.includes("multipart/form-data")) {
    // For multipart, we need to peek at the form data
    // We'll use a simple approach: parse the first field if it's scope
    let body = "";
    const chunks = [];

    req.on("data", (chunk) => chunks.push(chunk));
    req.once("end", () => {
      // This won't work well because multer expects the stream
      // Instead, we'll use a different approach
    });

    // Better approach: Just pass through and let the route handler deal with it
    next();
  } else {
    next();
  }
};

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
      // Optional sanity check so we don't attach to a non-existent item
      const item = await CareNeedItem.findById(targetId).select(
        "_id organizationId"
      );
      if (!item)
        return res.status(400).json({ error: "INVALID_CARE_NEED_ITEM" });
      if (String(item.organizationId) !== String(req.user.organizationId)) {
        return res.status(403).json({ error: "ORG_SCOPE_INVALID" });
      }
    } else if (scope === "UserProfile") {
      // Only allow users to upload their own profile picture
      if (String(targetId) !== String(req.user.id)) {
        return res.status(403).json({ error: "CAN_ONLY_UPDATE_OWN_PROFILE" });
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
// when scope=UserProfile:
//   - targetId should be the user's own ID
router.post("/upload", requireAuth, (req, res) => {
  upload.single("file")(req, res, async (err) => {
    try {
      if (err) return res.status(400).json({ error: err.message });

      const parseYMD = (s) => {
        if (!s || typeof s !== "string") return null;
        const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
        if (!m) return null;
        const y = Number(m[1]),
          mo = Number(m[2]),
          d = Number(m[3]);
        if (!y || !mo || !d) return null;
        return { y, mo, d };
      };

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

      console.log("[UPLOAD] Received scope:", scope);

      if (!scope) return res.status(400).json({ error: "MISSING_SCOPE" });

      // Resolve bucket if Shared
      if (scope === "Shared") {
        if (!bucketId) {
          if (!personId) {
            return res.status(400).json({ error: "MISSING_BUCKET_PARAMS" });
          }
          // Prefer bucket derived from effectiveDate if provided
          const ymd = parseYMD(effectiveDate);
          const targetYear = ymd?.y ?? Number(year);
          const targetMonth = ymd?.mo ?? Number(month);
          if (!targetYear || !targetMonth) {
            return res.status(400).json({ error: "MISSING_BUCKET_PARAMS" });
          }

          let bucket = await ReceiptBucket.findOne({
            personId,
            year: targetYear,
            month: targetMonth,
          });

          if (!bucket) {
            const label = new Date(targetYear, targetMonth - 1).toLocaleString(
              "en-AU",
              { month: "long", year: "numeric" }
            );
            bucket = await ReceiptBucket.create({
              personId,
              year: targetYear,
              month: targetMonth,
              title: `Receipts ${label}`,
            });
          }

          bucketId = String(bucket._id);
        }

        // For Shared, targetId is the bucket id
        targetId = bucketId;
      }

      // For UserProfile, ensure user can only upload to their own profile
      if (scope === "UserProfile") {
        const currentUserId = String(req.user.id || req.user._id);

        console.log("[DEBUG] UserProfile upload attempt");
        console.log("[DEBUG] req.body.targetId:", targetId);
        console.log("[DEBUG] currentUserId:", currentUserId);
        console.log("[DEBUG] req.body.scope:", scope);

        if (!targetId) {
          targetId = currentUserId;
        } else if (String(targetId) !== currentUserId) {
          return res.status(403).json({ error: "CAN_ONLY_UPDATE_OWN_PROFILE" });
        }
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

      // Handle file location based on environment
      let publicUrl;

      if (isProd) {
        // Production: Cloudinary already handled folder placement
        publicUrl = req.file.path; // Cloudinary secure URL
        console.log("[UPLOAD] Cloudinary URL:", publicUrl);
      } else {
        // Development: Move file from temp to correct folder
        const correctFolder = folderForScope(scope);
        const correctDir = path.join(UPLOAD_DIR, correctFolder);
        const correctPath = path.join(correctDir, req.file.filename);

        // Ensure target directory exists
        fs.mkdirSync(correctDir, { recursive: true });

        // Move file from temp to correct location
        fs.renameSync(req.file.path, correctPath);
        console.log("[UPLOAD] Moved file from temp to:", correctPath);

        publicUrl = `/uploads/${correctFolder}/${req.file.filename}`;
      }

      console.log("[UPLOAD] Final URL:", publicUrl);
      console.log("[UPLOAD] Final scope:", scope);

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

      // For UserProfile, update the user's avatarFileId and delete old avatar
      if (scope === "UserProfile") {
        const user = await User.findById(targetId);

        // Delete old avatar file if exists
        if (user.avatarFileId) {
          const oldAvatar = await FileUpload.findById(user.avatarFileId);
          if (oldAvatar) {
            await deleteUploadBlob(oldAvatar.urlOrPath);
            await FileUpload.deleteOne({ _id: oldAvatar._id });
          }
        }

        // Update user with new avatar
        await User.findByIdAndUpdate(targetId, { avatarFileId: doc._id });
      }

      res.status(201).json(doc);
    } catch (e) {
      console.error("[UPLOAD ERROR]", e);
      res.status(400).json({ error: e.message });
    }
  });
});

// ============ Get user avatar ============
// GET /api/file-upload/user-avatar/:userId
router.get("/user-avatar/:userId", requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select("avatarFileId").lean();

    if (!user || !user.avatarFileId) {
      return res.json({ avatar: null });
    }

    const avatar = await FileUpload.findById(user.avatarFileId).lean();
    res.json({ avatar });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ============ Delete user avatar ============
// DELETE /api/file-upload/user-avatar
router.delete("/user-avatar", requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user || !user.avatarFileId) {
      return res.status(404).json({ error: "NO_AVATAR_FOUND" });
    }

    const avatar = await FileUpload.findById(user.avatarFileId);
    if (avatar) {
      await deleteUploadBlob(avatar.urlOrPath);
      await FileUpload.deleteOne({ _id: avatar._id });
    }

    await User.findByIdAndUpdate(userId, { avatarFileId: null });

    res.json({ message: "Avatar deleted successfully" });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
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

// GET /api/file-upload/shared?personId=...&startDate=...&endDate=...
// Fetch shared receipts for a person within a date range
router.get("/shared", requireAuth, async (req, res) => {
  try {
    const { personId, startDate, endDate } = req.query;

    if (!personId) {
      return res.status(400).json({ error: "MISSING_PERSON_ID" });
    }

    // Build date filter for createdAt (when the file was actually uploaded)
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    // Find all buckets for this person
    const bucketFilter = { personId };
    const buckets = await ReceiptBucket.find(bucketFilter).lean();

    if (buckets.length === 0) {
      return res.json([]);
    }

    const bucketIds = buckets.map((b) => b._id);

    // Find all files in these buckets
    // Filter by createdAt instead of effectiveDate to match rolling time ranges
    const fileFilter = {
      scope: "Shared",
      bucketId: { $in: bucketIds },
    };

    // Use createdAt field for filtering since that's when the file was actually uploaded
    if (Object.keys(dateFilter).length > 0) {
      fileFilter.createdAt = dateFilter;
    }

    const files = await FileUpload.find(fileFilter)
      .sort({ createdAt: -1 })
      .lean();

    res.json(files);
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

// ============ Reference a shared file to a care task ============
// POST /api/file-upload/shared/reference-to-task  { careTaskId, fileId }
router.post("/shared/reference-to-task", requireAuth, async (req, res) => {
  try {
    const { careTaskId, fileId } = req.body;

    // Verify file exists and is shared
    const f = await FileUpload.findById(fileId);
    if (!f || f.scope !== "Shared")
      return res.status(400).json({ error: "NOT_A_SHARED_FILE" });

    // Verify task exists and user has access
    const task = await CareTask.findById(careTaskId);
    if (!task) return res.status(400).json({ error: "INVALID_TASK" });

    const access = await ensureCanWorkOnTask(req.user, task);
    if (!access.ok) return res.status(403).json({ error: access.code });

    // Add fileId to task's fileRefs
    await CareTask.updateOne(
      { _id: careTaskId },
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

    // If this is a UserProfile avatar, remove reference from User
    if (doc.scope === "UserProfile") {
      await User.updateMany({ avatarFileId: doc._id }, { avatarFileId: null });
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
