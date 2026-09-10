export interface FidelityResult {
  checked: boolean;
  diffScore: number | null;
  passed: boolean;
  reason?: string;
}

export interface StatusResponse {
  status: "queued" | "processing" | "succeeded" | "failed";
  videoUrl?: string;
  fidelity?: FidelityResult;
  error?: string;
  costUsd?: number;
}

async function jsonFetch<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, { credentials: "include", ...init });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error ?? `Error ${res.status}`);
  }
  return data as T;
}

export function login(password: string) {
  return jsonFetch<{ ok: true }>("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password })
  });
}

export function logout() {
  return jsonFetch<{ ok: true }>("/api/auth/logout", { method: "POST" });
}

export function checkSession() {
  return jsonFetch<{ ok: true }>("/api/auth/me");
}

export function submitGeneration(params: {
  file: File;
  prompt: string;
  motionStrength: number;
  durationSeconds: number;
  model: string;
  resolution?: string;
  aspectRatio?: string;
  generateAudio: boolean;
}) {
  const form = new FormData();
  form.append("image", params.file);
  form.append("prompt", params.prompt);
  form.append("motionStrength", String(params.motionStrength));
  form.append("durationSeconds", String(params.durationSeconds));
  form.append("model", params.model);
  if (params.resolution) form.append("resolution", params.resolution);
  if (params.aspectRatio) form.append("aspectRatio", params.aspectRatio);
  form.append("generateAudio", String(params.generateAudio));

  return jsonFetch<{ jobId: string }>("/api/generate", {
    method: "POST",
    body: form
  });
}

export function getStatus(jobId: string) {
  return jsonFetch<StatusResponse>(`/api/status/${jobId}`);
}

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

export function getVideoModels() {
  return jsonFetch<{ models: VideoModelInfo[] }>("/api/video-models");
}

export function suggestPrompts(prompt: string) {
  return jsonFetch<{ suggestions: string[] }>("/api/prompt-suggestions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt })
  });
}

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
  imagePromptEn: string;
  imagePromptEs: string;
}

export interface GeminiUsage {
  used: number;
  limit: number;
  date: string;
}

export function getGeminiQuota() {
  return jsonFetch<GeminiUsage>("/api/audio/quota");
}

export function transcribeAudio(file: File) {
  const form = new FormData();
  form.append("audio", file);

  return jsonFetch<{ segments: TranscriptSegment[]; quota: GeminiUsage }>("/api/audio/transcribe", {
    method: "POST",
    body: form
  });
}

export function generateSegmentImages(prompt: string) {
  return jsonFetch<{ images: string[] }>("/api/audio/generate-images", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt })
  });
}

export interface ReducedGroup {
  segmentIndices: number[];
  start: number;
  end: number;
  text: string;
  imagePromptEn: string;
  imagePromptEs: string;
  reason: string;
}

export function reduceSegments(segments: TranscriptSegment[]) {
  return jsonFetch<{ groups: ReducedGroup[]; quota: GeminiUsage }>("/api/audio/reduce", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ segments })
  });
}
