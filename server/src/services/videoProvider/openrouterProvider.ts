import { env } from "../../config/env.js";
import type {
  GenerateVideoInput,
  GenerateVideoJob,
  JobResult,
  VideoProvider
} from "./types.js";

/**
 * Adaptador para la API de generacion de video de OpenRouter
 * (openrouter.ai/docs/guides/overview/multimodal/video-generation), que
 * enruta a multiples modelos (Kling, Veo, Minimax, Seedance, Wan, Sora...)
 * facturados por segundo con una sola API key y saldo con auto-recarga.
 *
 * IMPORTANTE: es una API relativamente nueva (anunciada 2026), verifica el
 * shape de request/response contra la documentacion vigente antes de
 * producir con volumen real.
 *
 * Flujo: POST /videos encola el trabajo -> GET /videos/{id} para poll.
 * El video final NO se sirve con la url que devuelve OpenRouter directo:
 * se sirve a traves de nuestro propio proxy (routes/videoProxy.ts), porque
 * el endpoint de contenido requiere el header Authorization y un <video
 * src="..."> del navegador no puede adjuntarlo.
 */

async function openrouterFetch(path: string, init: RequestInit) {
  const res = await fetch(`${env.openrouterBaseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.openrouterApiKey}`,
      ...init.headers
    }
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OpenRouter respondio ${res.status}: ${body}`);
  }

  return res.json() as Promise<any>;
}

export class OpenRouterVideoProvider implements VideoProvider {
  async submit(input: GenerateVideoInput): Promise<GenerateVideoJob> {
    const imageUrl = `data:image/${input.imageFormat};base64,${input.imageBuffer.toString("base64")}`;

    const body: Record<string, unknown> = {
      model: input.model,
      prompt: input.prompt,
      duration: Math.round(input.durationSeconds),
      generate_audio: input.generateAudio ?? false,
      frame_images: [
        {
          type: "image_url",
          image_url: { url: imageUrl },
          frame_type: "first_frame"
        }
      ]
    };

    if (input.resolution) body.resolution = input.resolution;
    if (input.aspectRatio) body.aspect_ratio = input.aspectRatio;

    const json = await openrouterFetch("/videos", {
      method: "POST",
      body: JSON.stringify(body)
    });

    if (!json?.id) {
      throw new Error("La respuesta de OpenRouter no incluyo un id de trabajo.");
    }

    return { providerJobId: json.id };
  }

  async poll(providerJobId: string): Promise<JobResult> {
    const json = await openrouterFetch(`/videos/${providerJobId}`, { method: "GET" });

    const status: string = json?.status ?? "unknown";

    if (status === "pending") return { status: "queued" };
    if (status === "in_progress") return { status: "processing" };

    if (status !== "completed") {
      return {
        status: "failed",
        error: json?.error?.message ?? `Estado inesperado de OpenRouter: ${status}`
      };
    }

    if (!Array.isArray(json?.unsigned_urls) || json.unsigned_urls.length === 0) {
      return { status: "failed", error: "OpenRouter no devolvio urls de video." };
    }

    return {
      status: "succeeded",
      videoUrl: `/api/video-proxy/${providerJobId}`,
      costUsd: typeof json?.usage?.cost === "number" ? json.usage.cost : undefined
    };
  }
}
