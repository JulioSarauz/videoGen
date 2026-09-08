import { env } from "../config/env.js";

/**
 * Pollinations.ai: generador de imagenes gratuito, sin API key. Cada URL es
 * directamente la imagen (GET) - el frontend puede usarla como src de <img>
 * sin pasar por nuestro backend.
 */
export function buildImageVariantUrls(prompt: string, count: number): string[] {
  const encodedPrompt = encodeURIComponent(prompt);

  return Array.from({ length: count }, () => {
    const seed = Math.floor(Math.random() * 1_000_000_000);
    const params = new URLSearchParams({
      width: "1024",
      height: "1024",
      seed: String(seed),
      nologo: "true"
    });
    return `${env.pollinationsBaseUrl}/${encodedPrompt}?${params.toString()}`;
  });
}
