import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { env } from "../config/env.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { GeminiError, reduceSegments, transcribeAudioWithSegments } from "../services/gemini.js";
import { getGeminiUsage } from "../services/geminiQuota.js";
import { buildImageVariantUrls } from "../services/pollinations.js";

export const audioRouter = Router();

audioRouter.get("/quota", requireAuth, (_req, res) => {
  res.json(getGeminiUsage());
});

// Gemini puede leer el audio directamente de un archivo de video (frames +
// pista de audio), asi que aceptamos ambos: notas de voz y videos de
// WhatsApp suelen venir como audio/ogg, audio/mp4 (m4a) o video/mp4.
const ALLOWED_MEDIA_MIME = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/mp4",
  "audio/aac",
  "audio/ogg",
  "audio/flac",
  "audio/webm",
  "audio/opus",
  "audio/amr",
  "video/mp4",
  "video/mpeg",
  "video/quicktime",
  "video/webm",
  "video/3gpp",
  "video/x-msvideo",
  "video/x-matroska"
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.maxAudioMb * 1024 * 1024 }
});

audioRouter.post("/transcribe", requireAuth, upload.single("audio"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Falta el archivo de audio/video (campo 'audio')." });
  }

  if (!ALLOWED_MEDIA_MIME.has(req.file.mimetype)) {
    return res
      .status(422)
      .json({ error: `Formato no soportado: ${req.file.mimetype}` });
  }

  try {
    const segments = await transcribeAudioWithSegments(req.file.buffer, req.file.mimetype);
    res.json({ segments, quota: getGeminiUsage() });
  } catch (err) {
    if (err instanceof GeminiError) {
      return res.status(502).json({ error: err.message });
    }
    console.error("Error transcribiendo audio:", err);
    res.status(500).json({ error: "No se pudo transcribir el audio." });
  }
});

const generateImagesSchema = z.object({
  prompt: z.string().min(3, "El prompt de imagen esta vacio.")
});

audioRouter.post("/generate-images", requireAuth, (req, res) => {
  const parsed = generateImagesSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Datos invalidos." });
  }

  const images = buildImageVariantUrls(parsed.data.prompt, 3);
  res.json({ images });
});

const segmentSchema = z.object({
  start: z.number(),
  end: z.number(),
  text: z.string(),
  imagePromptEn: z.string(),
  imagePromptEs: z.string()
});

const reduceSchema = z.object({
  segments: z.array(segmentSchema).min(1, "No hay segmentos para reducir.")
});

audioRouter.post("/reduce", requireAuth, async (req, res) => {
  const parsed = reduceSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Datos invalidos." });
  }

  try {
    const groups = await reduceSegments(parsed.data.segments);
    res.json({ groups, quota: getGeminiUsage() });
  } catch (err) {
    if (err instanceof GeminiError) {
      return res.status(502).json({ error: err.message });
    }
    console.error("Error reduciendo segmentos:", err);
    res.status(500).json({ error: "No se pudo reducir los segmentos." });
  }
});
