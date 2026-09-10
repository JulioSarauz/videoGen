import { env } from "../config/env.js";

export interface VideoModelInfo {
  id: string;
  name: string;
  description?: string;
  supportedDurations: number[];
  supportedResolutions: string[];
  supportedAspectRatios: string[];
  generateAudioSupported: boolean;
  pricingSkus: Record<string, string>;
}

const CACHE_TTL_MS = 60 * 60 * 1000;
let cache: { data: VideoModelInfo[]; fetchedAt: number } | null = null;

/**
 * Catalogo de modelos de video de OpenRouter (openrouter.ai/api/v1/videos/models).
 * Se cachea en memoria porque cambia con poca frecuencia y el cliente lo
 * consulta para armar el selector + estimar costo.
 */
export async function listVideoModels(): Promise<VideoModelInfo[]> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.data;
  }

  const res = await fetch(`${env.openrouterBaseUrl}/videos/models`, {
    headers: { Authorization: `Bearer ${env.openrouterApiKey}` }
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OpenRouter respondio ${res.status} listando modelos: ${body}`);
  }

  const json = (await res.json()) as { data?: Record<string, any>[] };

  const data: VideoModelInfo[] = (json.data ?? []).map((m) => ({
    id: m.id,
    name: m.name ?? m.id,
    description: m.description,
    supportedDurations: m.supported_durations ?? [],
    supportedResolutions: m.supported_resolutions ?? [],
    supportedAspectRatios: m.supported_aspect_ratios ?? [],
    generateAudioSupported: m.generate_audio ?? false,
    pricingSkus: m.pricing_skus ?? {}
  }));

  cache = { data, fetchedAt: Date.now() };
  return data;
}
