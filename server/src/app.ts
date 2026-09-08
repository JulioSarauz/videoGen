import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { authRouter } from "./routes/auth.js";
import { generateRouter } from "./routes/generate.js";
import { statusRouter } from "./routes/status.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "public");

export function createApp() {
  const app = express();

  app.use(express.json());
  app.use(cookieParser());
  app.use(cors({ origin: true, credentials: true }));

  app.use("/api/auth", authRouter);
  app.use("/api/generate", generateRouter);
  app.use("/api/status", statusRouter);

  app.get("/health", (_req, res) => res.json({ ok: true }));

  // Sirve el frontend compilado (React/Vite) desde el mismo proceso: monolito real.
  app.use(express.static(publicDir));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    res.sendFile(path.join(publicDir, "index.html"));
  });

  return app;
}
