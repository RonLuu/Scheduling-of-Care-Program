import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import passport from "passport";
import { createProxyMiddleware } from "http-proxy-middleware";

import { connectDB } from "./models/index.js";
import routes from "./routes/index.js";
import "./middleware/passport.js";

import CareTask from "./models/CareTask.js"; // ensure indexes are created

dotenv.config();

const app = express();
const PORT = process.env.PORT;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ————— Core middleware —————
app.use(cors());
app.use(passport.initialize());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Keep serving uploads from server/public/uploads
app.use("/uploads", express.static(path.join(__dirname, "public", "uploads")));

// ————— API routes first —————
app.use("/api", routes);

// ————— Frontend wiring (DEV vs PROD) —————
const CLIENT_DIST = path.join(__dirname, "..", "client", "dist");
const IS_PROD =
  process.env.NODE_ENV === "production" || fs.existsSync(CLIENT_DIST);

// In PRODUCTION: serve the built React app from client/dist
if (IS_PROD) {
  if (!fs.existsSync(CLIENT_DIST)) {
    console.warn(
      "[server] client/dist not found. Did you run `npm run build` in /client?"
    );
  }
  app.use(express.static(CLIENT_DIST));

  // All non-API routes -> index.html (SPA fallback)
  app.get(/^\/(?!api|uploads).*/, (_req, res) => {
    res.sendFile(path.join(CLIENT_DIST, "index.html"));
  });
} else {
  // In DEVELOPMENT: proxy to Vite dev server (keeps frontend entry on :3000)
  const VITE_TARGET = "http://localhost:5173";

  // Anything that's not /api or /uploads goes to Vite
  app.use(
    /^\/(?!api|uploads).*/,
    createProxyMiddleware({
      target: VITE_TARGET,
      changeOrigin: true,
      ws: true, // enable websockets (HMR)
      logLevel: "warn",
    })
  );

  console.log(
    `[server] Dev mode: proxying non-/api requests to ${VITE_TARGET}. Open http://localhost:${PORT}`
  );
}

// ————— Start server & DB —————
const start = async () => {
  try {
    await connectDB();
    (async () => {
      try {
        // Will create indexes defined in the schema AND drop any extras not in the schema
        await CareTask.syncIndexes();
      } catch (e) {
        console.error("syncIndexes failed for CareTask:", e);
      }
    })();
    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    // Graceful shutdown
    const shutdown = async () => {
      console.log("Shutting down…");
      server.close(async () => {
        const { mongoose } = await import("./models/index.js");
        await mongoose.connection.close(false);
        process.exit(0);
      });
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
};

start();
