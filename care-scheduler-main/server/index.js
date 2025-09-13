import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import passport from "passport";

import { connectDB } from "./models/index.js";
import routes from "./routes/index.js";
import "./middleware/passport.js";
import { server_port } from "../constants.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(passport.initialize());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the React app
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "..", "public")));
app.use("/uploads", express.static(path.join(__dirname, "public", "uploads")));

app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile("public/index.html");
});

app.use("/api", routes);

const start = async () => {
  try {
    await connectDB();
    const server = app.listen(server_port, () => {
      console.log(`Server running on port ${server_port}`);
    });

    // Graceful shutdown
    const shutdown = () => {
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
