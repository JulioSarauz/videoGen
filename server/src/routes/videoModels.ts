import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { listVideoModels } from "../services/videoModels.js";

export const videoModelsRouter = Router();

videoModelsRouter.get("/", requireAuth, async (_req, res) => {
  try {
    const models = await listVideoModels();
    res.json({ models });
  } catch (err) {
    console.error("Error listando modelos de video:", err);
    res.status(502).json({ error: "No se pudo obtener el catalogo de modelos de OpenRouter." });
  }
});
