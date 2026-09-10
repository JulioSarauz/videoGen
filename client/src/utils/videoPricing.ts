/**
 * Estimador de costo para el catalogo de modelos de video de OpenRouter.
 * Los pricing_skus NO siguen un esquema unico entre proveedores:
 *  - Kling/Veo/Sora/Wan/Minimax: $ por segundo, con sufijos de resolucion
 *    y/o audio (ej. "duration_seconds_with_audio_1080p").
 *  - Seedance (ByteDance): $ por "token de video" = ancho*alto*duracion*24/1024.
 * Esto es un ESTIMADO para mostrar antes de generar; el costo real lo
 * informa OpenRouter al completar el job (ver StatusResponse.costUsd).
 */

const RESOLUTION_PIXELS: Record<string, [number, number]> = {
  "480p": [854, 480],
  "720p": [1280, 720],
  "768p": [1366, 768],
  "1080p": [1920, 1080],
  "1k": [1024, 1024],
  "2k": [2048, 2048],
  "4k": [3840, 2160]
};

function resolutionPixels(resolution: string | undefined, aspectRatio: string | undefined): [number, number] | null {
  if (!resolution) return null;
  const base = RESOLUTION_PIXELS[resolution.toLowerCase()];
  if (!base) return null;

  const [w, h] = aspectRatio?.split(":").map(Number) ?? [];
  const isVertical = !!w && !!h && h > w;
  return isVertical ? [base[1], base[0]] : base;
}

export interface CostEstimateParams {
  durationSeconds: number;
  resolution?: string;
  aspectRatio?: string;
  generateAudio: boolean;
}

export function estimateVideoCost(
  pricingSkus: Record<string, string>,
  params: CostEstimateParams
): number | null {
  const keys = Object.keys(pricingSkus);
  if (keys.length === 0) return null;

  const resSuffix = params.resolution?.toLowerCase();
  const isTokenBased = keys.some((k) => k.startsWith("video_tokens"));

  if (isTokenBased) {
    const pixels = resolutionPixels(params.resolution, params.aspectRatio);
    if (!pixels) return null;
    const [width, height] = pixels;
    const tokens = (width * height * params.durationSeconds * 24) / 1024;

    const candidates = [
      resSuffix && `video_tokens_${resSuffix}`,
      !params.generateAudio && "video_tokens_without_audio",
      "video_tokens"
    ].filter((k): k is string => !!k);

    const priceKey = candidates.find((k) => pricingSkus[k] !== undefined) ?? keys[0];
    return tokens * Number(pricingSkus[priceKey]);
  }

  const audioSuffix = params.generateAudio ? "with_audio" : "without_audio";
  const candidates = [
    resSuffix && `image_to_video_duration_seconds_${resSuffix}`,
    resSuffix && `duration_seconds_${audioSuffix}_${resSuffix}`,
    resSuffix && `duration_seconds_${resSuffix}`,
    `duration_seconds_${audioSuffix}`,
    "duration_seconds"
  ].filter((k): k is string => !!k);

  const priceKey = candidates.find((k) => pricingSkus[k] !== undefined) ?? keys[0];
  return Number(pricingSkus[priceKey]) * params.durationSeconds;
}
