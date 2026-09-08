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

  klingApiKey: required("KLING_API_KEY"),
  klingBaseUrl: optional("KLING_BASE_URL", "https://api.klingai.com"),
  klingImage2VideoPath: optional("KLING_IMAGE2VIDEO_PATH", "/v1/videos/image2video"),
  klingImage2VideoStatusPath: optional(
    "KLING_IMAGE2VIDEO_STATUS_PATH",
    "/v1/videos/image2video"
  ),

  maxUploadMb: Number(optional("MAX_UPLOAD_MB", "15")),
  minLongEdgePx: Number(optional("MIN_LONG_EDGE_PX", "1080")),

  fidelityMaxDiff: Number(optional("FIDELITY_MAX_DIFF", "0.18")),

  geminiApiKey: required("GEMINI_API_KEY"),
  geminiModel: optional("GEMINI_MODEL", "gemini-2.5-flash"),
  maxAudioMb: Number(optional("MAX_AUDIO_MB", "50")),

  pollinationsBaseUrl: optional("POLLINATIONS_BASE_URL", "https://image.pollinations.ai/prompt")
};
