import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { configureCloudinary } from "./cloudinary.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, "..", "public");
const UPLOADS_DIR = path.join(PUBLIC_DIR, "uploads");

// Extract Cloudinary public_id from URL
const publicIdFromUrl = (url) => {
  try {
    const u = new URL(url);
    const pathname = u.pathname;

    // Cloudinary URL format:
    // /v1234567890/folder/subfolder/filename.ext
    // or: /{resource_type}/upload/v1234567890/folder/subfolder/filename.ext

    // Find the version marker (vXXXXXXXXXX)
    const parts = pathname.split("/");
    const vIndex = parts.findIndex((p) => /^v\d+$/.test(p));

    if (vIndex === -1) {
      console.warn("[DELETE] No version marker found in URL:", url);
      return null;
    }

    // Everything after version marker is the path
    // Remove the version marker itself and get the rest
    const pathAfterVersion = parts.slice(vIndex + 1);

    // Join and remove file extension
    const fullPath = pathAfterVersion.join("/");
    const publicId = fullPath.replace(/\.[^/.]+$/, "");

    console.log("[DELETE] Extracted public_id:", publicId);
    return publicId;
  } catch (error) {
    console.warn("[DELETE] Failed to parse URL:", url, error.message);
    return null;
  }
};

// Infer resource type from URL
const getResourceType = (url) => {
  const imgExts = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i;
  const videoExts = /\.(mp4|avi|mov|wmv|flv|webm)$/i;

  if (imgExts.test(url)) return "image";
  if (videoExts.test(url)) return "video";

  // Check URL path for resource type hints
  if (url.includes("/image/upload/")) return "image";
  if (url.includes("/video/upload/")) return "video";
  if (url.includes("/raw/upload/")) return "raw";

  return "raw"; // default fallback for documents, etc.
};

export const deleteUploadBlob = async (urlOrPath) => {
  if (!urlOrPath) {
    console.log("[DELETE] No URL/path provided");
    return;
  }

  // Cloudinary?
  if (/cloudinary\.com/.test(urlOrPath)) {
    try {
      const cloudinary = configureCloudinary();
      const publicId = publicIdFromUrl(urlOrPath);

      if (!publicId) {
        console.warn("[DELETE] Could not extract public_id from:", urlOrPath);
        return;
      }

      const resourceType = getResourceType(urlOrPath);

      console.log(`[DELETE] Attempting to delete from Cloudinary:`, {
        publicId,
        resourceType,
        url: urlOrPath,
      });

      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
      });

      console.log("[DELETE] Cloudinary destroy result:", result);

      if (result.result !== "ok" && result.result !== "not found") {
        console.warn("[DELETE] Unexpected Cloudinary result:", result);
      }
    } catch (e) {
      console.error("[DELETE] Cloudinary destroy failed:", e.message);
    }
    return;
  }

  // Local file (dev only)
  try {
    // strip leading slash and resolve against PUBLIC_DIR
    const rel = urlOrPath.replace(/^[\\/]+/, "");
    const abs = path.join(PUBLIC_DIR, rel);

    // Safety guard: only delete files in uploads directory
    if (!abs.startsWith(UPLOADS_DIR)) {
      console.warn(
        "[DELETE] Attempted to delete file outside uploads dir:",
        abs
      );
      return;
    }

    console.log("[DELETE] Deleting local file:", abs);
    await fs.unlink(abs);
    console.log("[DELETE] Local file deleted successfully");
  } catch (e) {
    if (e.code === "ENOENT") {
      console.log(
        "[DELETE] Local file not found (already deleted?):",
        urlOrPath
      );
    } else {
      console.error("[DELETE] Local unlink failed:", e.message);
    }
  }
};
