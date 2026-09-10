import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { env } from "../config/env.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { ImageValidationError, validateImage } from "../services/imageValidation.js";
import { createJob } from "../services/jobStore.js";
import { videoProvider } from "../services/videoProvider/index.js";
import { wrapMotionPrompt } from "../utils/promptWrapper.js";

export const generateRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.maxUploadMb * 1024 * 1024 }
});

const bodySchema = z.object({
  prompt: z.string().min(3, "Describe el movimiento que quieres ver."),
  motionStrength: z.coerce.number().min(0).max(1).default(0.3),
  durationSeconds: z.coerce.number().min(1).max(20).default(5),
  model: z.string().min(1, "Selecciona un modelo de video."),
  resolution: z.string().optional(),
  aspectRatio: z.string().optional(),
  // z.coerce.boolean() trata cualquier string no vacio (incluido "false") como true,
  // por eso se compara explicitamente contra "true".
  generateAudio: z
    .string()
    .optional()
    .transform((value) => value === "true")
});

generateRouter.post("/", requireAuth, upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Falta el archivo de imagen (campo 'image')." });
  }

  const parsedBody = bodySchema.safeParse(req.body);
  if (!parsedBody.success) {
    return res.status(400).json({ error: parsedBody.error.issues[0]?.message ?? "Datos invalidos." });
  }

  try {
    const image = await validateImage(req.file.buffer);
    const prompt = wrapMotionPrompt(parsedBody.data.prompt);

    const job = await videoProvider.submit({
      imageBuffer: image.buffer,
      imageFormat: image.format,
      prompt,
      motionStrength: parsedBody.data.motionStrength,
      durationSeconds: parsedBody.data.durationSeconds,
      model: parsedBody.data.model,
      resolution: parsedBody.data.resolution,
      aspectRatio: parsedBody.data.aspectRatio,
      generateAudio: parsedBody.data.generateAudio
    });

    const jobId = createJob(job.providerJobId, image.buffer);
    res.json({ jobId });
  } catch (err) {
    if (err instanceof ImageValidationError) {
      return res.status(422).json({ error: err.message });
    }
    console.error("Error generando video:", err);
    res.status(502).json({ error: "El proveedor de video no pudo procesar la solicitud." });
  }
});
