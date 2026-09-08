import sharp from "sharp";
import { env } from "../config/env.js";

const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp"]);

export interface ValidatedImage {
  buffer: Buffer;
  format: string;
  width: number;
  height: number;
}

export class ImageValidationError extends Error {}

/**
 * Valida la imagen sin recomprimirla ni redimensionarla: el objetivo es
 * mandar al proveedor de video exactamente los mismos bytes que subio el
 * usuario, para no introducir artefactos que luego se lean como
 * "distorsion" del modelo generativo.
 */
export async function validateImage(buffer: Buffer): Promise<ValidatedImage> {
  const metadata = await sharp(buffer).metadata();

  if (!metadata.format || !ALLOWED_FORMATS.has(metadata.format)) {
    throw new ImageValidationError(
      `Formato no soportado: ${metadata.format ?? "desconocido"}. Usa JPEG, PNG o WEBP.`
    );
  }

  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  const longEdge = Math.max(width, height);

  if (longEdge < env.minLongEdgePx) {
    throw new ImageValidationError(
      `La imagen es demasiado pequena (${width}x${height}). El lado mas largo debe ser de al menos ${env.minLongEdgePx}px para asegurar calidad ~1080p.`
    );
  }

  return { buffer, format: metadata.format, width, height };
}
