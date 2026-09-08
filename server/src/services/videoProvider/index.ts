import { KlingVideoProvider } from "./klingProvider.js";
import type { VideoProvider } from "./types.js";

// Punto unico de swap: si en el futuro cambias de proveedor, solo se toca
// este archivo (el resto del backend depende de la interfaz VideoProvider).
export const videoProvider: VideoProvider = new KlingVideoProvider();

export * from "./types.js";
