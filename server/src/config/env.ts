import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

// server/src/config -> server/src -> server -> raiz del repo, donde vive .env.
// Funciona igual en dev (tsx corre desde src/) y en build (node corre desde dist/,
// que espeja la misma profundidad de carpetas).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, "../../../.env") });

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === "") {
    throw new Error(`Falta la variable de entorno requerida: ${name}`);
  }
  return value;
}

function optional(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

export const env = {
  port: Number(optional("PORT", "3000")),
  nodeEnv: optional("NODE_ENV", "development"),
  isProd: optional("NODE_ENV", "development") === "production",

  authPasswordHash: required("AUTH_PASSWORD_HASH"),
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: optional("JWT_EXPIRES_IN", "12h"),
  cookieSecure: optional("COOKIE_SECURE", "true") === "true",

  // --- Proveedor de video activo: OpenRouter (enruta a Kling/Veo/Minimax/  ---
  // --- Seedance/Wan/Sora, entre otros) con una sola key y auto-recarga.    ---
  openrouterApiKey: required("OPENROUTER_API_KEY"),
  openrouterBaseUrl: optional("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"),
  // Modelo de texto usado para sugerencias de prompt (no genera video).
  // Verificar en openrouter.ai/models que el slug siga vigente.
  openrouterTextModel: optional("OPENROUTER_TEXT_MODEL", "openai/gpt-4o-mini"),

  maxUploadMb: Number(optional("MAX_UPLOAD_MB", "15")),
  minLongEdgePx: Number(optional("MIN_LONG_EDGE_PX", "1080")),

  fidelityMaxDiff: Number(optional("FIDELITY_MAX_DIFF", "0.18")),

  geminiApiKey: required("GEMINI_API_KEY"),
  geminiModel: optional("GEMINI_MODEL", "gemini-2.5-flash"),
  geminiDailyQuota: Number(optional("GEMINI_DAILY_QUOTA", "20")),
  maxAudioMb: Number(optional("MAX_AUDIO_MB", "50")),

  pollinationsBaseUrl: optional("POLLINATIONS_BASE_URL", "https://image.pollinations.ai/prompt")
};
