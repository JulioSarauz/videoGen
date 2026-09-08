import sharp from "sharp";
import { env } from "../config/env.js";

export interface FidelityResult {
  checked: boolean;
  diffScore: number | null;
  passed: boolean;
  reason?: string;
}

const HASH_SIZE = 32; // 32x32 en gris = suficiente para detectar cambios de contenido/texto

async function grayscalePixels(buffer: Buffer): Promise<Uint8Array> {
  const { data } = await sharp(buffer)
    .resize(HASH_SIZE, HASH_SIZE, { fit: "fill" })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return data;
}

/**
 * Compara la imagen original contra el frame de portada devuelto por el
 * proveedor de video (si lo entrega). No es SSIM real, pero una diferencia
 * media normalizada en escala de grises es suficiente para detectar cuando
 * el modelo reescribio contenido (texto, logos, colores) en vez de solo
 * animar la imagen original.
 */
export async function checkFidelity(
  originalBuffer: Buffer,
  coverImageBuffer: Buffer | null
): Promise<FidelityResult> {
  if (!coverImageBuffer) {
    return {
      checked: false,
      diffScore: null,
      passed: true,
      reason: "El proveedor no devolvio una imagen de portada para comparar."
    };
  }

  const [a, b] = await Promise.all([
    grayscalePixels(originalBuffer),
    grayscalePixels(coverImageBuffer)
  ]);

  let totalDiff = 0;
  for (let i = 0; i < a.length; i++) {
    totalDiff += Math.abs(a[i] - b[i]);
  }
  const diffScore = totalDiff / (a.length * 255);

  return {
    checked: true,
    diffScore,
    passed: diffScore <= env.fidelityMaxDiff
  };
}
