import "dotenv/config";

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

  klingAccessKey: required("KLING_ACCESS_KEY"),
  klingSecretKey: required("KLING_SECRET_KEY"),
  klingBaseUrl: optional("KLING_BASE_URL", "https://api.klingai.com"),
  klingImage2VideoPath: optional("KLING_IMAGE2VIDEO_PATH", "/v1/videos/image2video"),
  klingImage2VideoStatusPath: optional(
    "KLING_IMAGE2VIDEO_STATUS_PATH",
    "/v1/videos/image2video"
  ),

  maxUploadMb: Number(optional("MAX_UPLOAD_MB", "15")),
  minLongEdgePx: Number(optional("MIN_LONG_EDGE_PX", "1080")),

  fidelityMaxDiff: Number(optional("FIDELITY_MAX_DIFF", "0.18"))
};
