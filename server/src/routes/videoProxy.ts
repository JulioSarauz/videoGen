import { Router } from "express";
import { Readable } from "node:stream";
import { env } from "../config/env.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const videoProxyRouter = Router();

/**
 * Transmite el video generado por OpenRouter al navegador. No podemos pasar
 * la url de OpenRouter directo al <video src="...">: el endpoint de
 * contenido requiere el header Authorization, que un tag <video> no puede
 * adjuntar, asi que este proxy hace el fetch autenticado y reenvia el body.
 */
videoProxyRouter.get("/:providerJobId", requireAuth, async (req, res) => {
  try {
    const upstream = await fetch(
      `${env.openrouterBaseUrl}/videos/${req.params.providerJobId}/content?index=0`,
      {
        headers: {
          Authorization: `Bearer ${env.openrouterApiKey}`,
          ...(req.headers.range ? { Range: req.headers.range } : {})
        }
      }
    );

    if (!upstream.ok && upstream.status !== 206) {
      return res.status(502).json({ error: "No se pudo obtener el video de OpenRouter." });
    }

    res.status(upstream.status);
    for (const header of ["content-type", "content-length", "accept-ranges", "content-range"]) {
      const value = upstream.headers.get(header);
      if (value) res.setHeader(header, value);
    }

    if (!upstream.body) {
      return res.end();
    }

    Readable.fromWeb(upstream.body as any).pipe(res);
  } catch (err) {
    console.error("Error en proxy de video:", err);
    res.status(502).json({ error: "No se pudo transmitir el video." });
  }
});
