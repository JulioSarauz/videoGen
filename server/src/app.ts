import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { audioRouter } from "./routes/audio.js";
import { authRouter } from "./routes/auth.js";
import { generateRouter } from "./routes/generate.js";
import { statusRouter } from "./routes/status.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "public");
const hasClientBuild = existsSync(path.join(publicDir, "index.html"));

export function createApp() {
  const app = express();

  app.use(express.json());
  app.use(cookieParser());
  app.use(cors({ origin: true, credentials: true }));

  app.use("/api/auth", authRouter);
  app.use("/api/generate", generateRouter);
  app.use("/api/status", statusRouter);
  app.use("/api/audio", audioRouter);

  app.get("/health", (_req, res) => res.json({ ok: true }));

  if (hasClientBuild) {
    // Sirve el frontend compilado (React/Vite) desde el mismo proceso: monolito real.
    app.use(express.static(publicDir));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api/")) return next();
      res.sendFile(path.join(publicDir, "index.html"));
    });
  } else {
    // En dev sin build del cliente: el frontend corre aparte con Vite (npm run dev:client).
    app.get("/", (_req, res) => {
      res.type("text/plain").send(
        "genVideo backend activo. No hay build del cliente en este proceso.\n" +
          "En desarrollo, abre el frontend en http://localhost:5173 (npm run dev:client).\n" +
          "En produccion, corre `npm run build` antes de `npm run start`."
      );
    });
  }

  return app;
}
