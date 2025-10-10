import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { configureCloudinary } from "./cloudinary.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, "..", "public");
const UPLOADS_DIR = path.join(PUBLIC_DIR, "uploads");

/**
 * Extract Cloudinary public_id from URL
 */
const publicIdFromUrl = (url) => {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);

    const uploadIndex = parts.findIndex((p) => p === "upload");
    if (uploadIndex === -1) return null;

    const afterUpload = parts.slice(uploadIndex + 1);
    const withoutVersion = /^v\d+$/.test(afterUpload[0])
      ? afterUpload.slice(1)
      : afterUpload;

    const publicId = withoutVersion.join("/").replace(/\.[^/.]+$/, "");

    console.log("[DELETE] Extracted public_id:", publicId);
    return publicId;
  } catch (e) {
    console.error("[DELETE] Error parsing URL:", e.message);
    return null;
  }
};

/**
 * Detect resource type from URL or filename
 * Cloudinary destroy only accepts: 'image', 'video', 'raw'
 */
const getResourceType = (urlOrPath) => {
  const lower = urlOrPath.toLowerCase();

  // PDFs and documents = raw
  if (/\.(pdf|doc|docx|txt|csv|xlsx|xls|ppt|pptx)$/i.test(lower)) {
    return "raw";
  }

  // Videos
  if (/\.(mp4|mov|avi|webm|flv|mkv)$/i.test(lower)) {
    return "video";
  }

  // Default to image (jpg, png, gif, webp, svg, etc.)
  return "image";
};

export const deleteUploadBlob = async (urlOrPath) => {
  if (!urlOrPath) {
    console.warn("[DELETE] No URL/path provided");
    return;
  }

  // Cloudinary deletion
  if (/cloudinary\.com/.test(urlOrPath)) {
    try {
      const cloudinary = configureCloudinary();
      const publicId = publicIdFromUrl(urlOrPath);

      if (!publicId) {
        console.warn("[DELETE] Could not extract public_id from:", urlOrPath);
        return;
      }

      const resourceType = getResourceType(urlOrPath);

      console.log(
        `[DELETE] Deleting from Cloudinary: ${publicId} (type: ${resourceType})`
      );

      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType, // Must be 'image', 'video', or 'raw'
        invalidate: true,
      });

      if (result.result === "ok") {
        console.log(`[DELETE] ✅ Successfully deleted:`, publicId);
      } else if (result.result === "not found") {
        console.warn(`[DELETE] ⚠️ File not found:`, publicId);
      } else {
        console.warn(`[DELETE] ⚠️ Unexpected result:`, result);
      }

      return result;
    } catch (e) {
      console.error("[DELETE] ❌ Cloudinary deletion failed:", e.message);
      // Don't throw - allow DB record to be deleted even if Cloudinary fails
    }
    return;
  }

  // Local file deletion (development)
  try {
    const rel = urlOrPath.replace(/^[\\/]+/, "");
    const abs = path.join(PUBLIC_DIR, rel);

    if (!abs.startsWith(UPLOADS_DIR)) {
      console.warn("[DELETE] File outside uploads directory:", abs);
      return;
    }

    await fs.unlink(abs);
    console.log("[DELETE] ✅ Deleted local file:", abs);
  } catch (e) {
    if (e.code === "ENOENT") {
      console.warn("[DELETE] ⚠️ Local file not found:", urlOrPath);
    } else {
      console.error("[DELETE] ❌ Local deletion failed:", e.message);
    }
  }
};
