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
    const parts = u.pathname.split("/");
    const vIndex = parts.findIndex((p) => /^v\d+/.test(p));
    const withoutVersion =
      vIndex > -1 ? parts.slice(vIndex + 1) : parts.slice(1);
    const noExt = withoutVersion.join("/").replace(/\.[^/.]+$/, "");
    return noExt; // e.g. scheduling-of-care/Shared/169..._file
  } catch {
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
  if (!urlOrPath) return;

  // Cloudinary?
  if (/cloudinary\.com/.test(urlOrPath)) {
    try {
      const cloudinary = configureCloudinary();
      const publicId = publicIdFromUrl(urlOrPath);
      if (publicId) {
        const resourceType = getResourceType(urlOrPath);
        await cloudinary.uploader.destroy(publicId, {
          resource_type: resourceType,
        });
      }
    } catch (e) {
      console.warn("[DELETE] Cloudinary destroy failed:", e.message);
    }
    return;
  }

  // Local file (dev only)
  try {
    // strip leading slash and resolve against PUBLIC_DIR
    const rel = urlOrPath.replace(/^[\\/]+/, "");
    const abs = path.join(PUBLIC_DIR, rel);
    if (!abs.startsWith(UPLOADS_DIR)) return; // safety guard
    await fs.unlink(abs);
  } catch (e) {
    if (e.code !== "ENOENT") {
      console.warn("[DELETE] Local unlink failed:", e.message);
    }
  }
};
