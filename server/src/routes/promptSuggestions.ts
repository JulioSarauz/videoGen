import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/requireAuth.js";
import { suggestPrompts } from "../services/promptSuggestions.js";

export const promptSuggestionsRouter = Router();

const bodySchema = z.object({ prompt: z.string().default("") });

promptSuggestionsRouter.post("/", requireAuth, async (req, res) => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Datos invalidos." });
  }

  try {
    const suggestions = await suggestPrompts(parsed.data.prompt);
    res.json({ suggestions });
  } catch (err) {
    console.error("Error generando sugerencias de prompt:", err);
    res.status(502).json({ error: "No se pudieron generar sugerencias de prompt." });
  }
});
