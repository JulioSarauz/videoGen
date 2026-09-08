import { env } from "../../config/env.js";
import type {
  GenerateVideoInput,
  GenerateVideoJob,
  JobResult,
  VideoProvider
} from "./types.js";

/**
 * Adaptador para Kling AI (klingai.com, plataforma de desarrolladores).
 *
 * IMPORTANTE: Kling cambia con cierta frecuencia los paths exactos de su API
 * de "image to video" y el shape de la respuesta. Antes de usar esto en
 * produccion, verifica contra la documentacion vigente:
 *   https://app.klingai.com/  (panel de desarrollador -> API docs)
 * y ajusta KLING_IMAGE2VIDEO_PATH / KLING_IMAGE2VIDEO_STATUS_PATH en .env
 * si cambian.
 *
 * Autenticacion: metodo de API Key unica (bearer token), el recomendado por
 * Kling actualmente. El "Name" que se le pone a la key en su dashboard es
 * solo una etiqueta para identificarla ahi, no forma parte de la credencial.
 */

async function klingFetch(path: string, init: RequestInit) {
  const res = await fetch(`${env.klingBaseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.klingApiKey}`,
      ...init.headers
    }
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Kling API respondio ${res.status}: ${body}`);
  }

  return res.json() as Promise<any>;
}

export class KlingVideoProvider implements VideoProvider {
  async submit(input: GenerateVideoInput): Promise<GenerateVideoJob> {
    const base64Image = input.imageBuffer.toString("base64");

    const body = {
      model_name: "kling-v1",
      image: base64Image,
      prompt: input.prompt,
      mode: "std",
      duration: String(input.durationSeconds),
      // Cuanto mas bajo, mas se apega el modelo al contenido de la imagen
      // original (menos "creatividad" = menos riesgo de distorsionar texto/logos).
      cfg_scale: clampCfgScale(input.motionStrength)
    };

    const json = await klingFetch(env.klingImage2VideoPath, {
      method: "POST",
      body: JSON.stringify(body)
    });

    const jobId = json?.data?.task_id ?? json?.data?.id;
    if (!jobId) {
      throw new Error("La respuesta de Kling no incluyo un task_id/id de trabajo.");
    }

    return { providerJobId: jobId };
  }

  async poll(providerJobId: string): Promise<JobResult> {
    const json = await klingFetch(`${env.klingImage2VideoStatusPath}/${providerJobId}`, {
      method: "GET"
    });

    const status: string = json?.data?.task_status ?? json?.data?.status ?? "unknown";
    const videos = json?.data?.task_result?.videos ?? [];
    const first = videos[0];

    if (status === "succeed" || status === "succeeded" || status === "completed") {
      return {
        status: "succeeded",
        videoUrl: first?.url,
        coverImageUrl: first?.cover_image_url
      };
    }

    if (status === "failed") {
      return { status: "failed", error: json?.data?.task_status_msg ?? "Fallo desconocido." };
    }

    if (status === "processing" || status === "submitted" || status === "queued") {
      return { status: status === "processing" ? "processing" : "queued" };
    }

    return { status: "processing" };
  }
}

function clampCfgScale(motionStrength: number): number {
  // Kling usa cfg_scale ~0.1 (muy libre) a ~1.0 (muy apegado al prompt/imagen).
  // Invertimos motionStrength (0 = quieto, 1 = mucho movimiento) hacia un
  // cfg_scale que favorezca fidelidad por defecto.
  const clamped = Math.min(Math.max(motionStrength, 0), 1);
  return Number((1 - clamped * 0.5).toFixed(2));
}
