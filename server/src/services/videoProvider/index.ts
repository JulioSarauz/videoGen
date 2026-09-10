import { OpenRouterVideoProvider } from "./openrouterProvider.js";
import type { VideoProvider } from "./types.js";

// Punto unico de swap: si en el futuro cambias de proveedor, solo se toca
// este archivo (el resto del backend depende de la interfaz VideoProvider).
export const videoProvider: VideoProvider = new OpenRouterVideoProvider();

export * from "./types.js";
