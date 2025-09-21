import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, "..", "public"); // …/public
const UPLOADS_DIR = path.join(PUBLIC_DIR, "uploads"); // …/public/uploads

export async function deleteUploadBlob(urlOrPath) {
  if (!urlOrPath) return;
  // strip leading slash and resolve against PUBLIC_DIR
  const rel = urlOrPath.replace(/^[\\/]+/, ""); // e.g. "uploads/CareNeedItem/abc.pdf"
  const abs = path.join(PUBLIC_DIR, rel); // …/public/uploads/CareNeedItem/abc.pdf
  // guard: ensure we're still inside /public/uploads
  if (!abs.startsWith(UPLOADS_DIR)) return;

  try {
    await fs.unlink(abs);
    // optional: attempt to remove empty parent dir(s); ignore errors
    // (keeps things neat without being critical)
  } catch (e) {
    // If file is already gone, ignore; log other errors if you want:
    if (e.code !== "ENOENT") {
      console.warn("[DELETE_BLOB] unlink failed:", abs, e.message);
    }
  }
}
