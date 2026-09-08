import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { checkFidelity } from "../services/fidelityCheck.js";
import { getJob } from "../services/jobStore.js";
import { videoProvider } from "../services/videoProvider/index.js";

export const statusRouter = Router();

statusRouter.get("/:jobId", requireAuth, async (req, res) => {
  const job = getJob(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: "Job no encontrado o expirado." });
  }

  try {
    const result = await videoProvider.poll(job.providerJobId);

    if (result.status !== "succeeded") {
      return res.json({ status: result.status, error: result.error });
    }

    let coverBuffer: Buffer | null = null;
    if (result.coverImageUrl) {
      const coverRes = await fetch(result.coverImageUrl);
      if (coverRes.ok) {
        coverBuffer = Buffer.from(await coverRes.arrayBuffer());
      }
    }

    const fidelity = await checkFidelity(job.originalImageBuffer, coverBuffer);

    res.json({
      status: "succeeded",
      videoUrl: result.videoUrl,
      fidelity
    });
  } catch (err) {
    console.error("Error consultando estado del job:", err);
    res.status(502).json({ error: "No se pudo consultar el estado en el proveedor." });
  }
});
