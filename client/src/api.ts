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
}) {
  const form = new FormData();
  form.append("image", params.file);
  form.append("prompt", params.prompt);
  form.append("motionStrength", String(params.motionStrength));
  form.append("durationSeconds", String(params.durationSeconds));

  return jsonFetch<{ jobId: string }>("/api/generate", {
    method: "POST",
    body: form
  });
}

export function getStatus(jobId: string) {
  return jsonFetch<StatusResponse>(`/api/status/${jobId}`);
}

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
  imagePrompt: string;
}

export function transcribeAudio(file: File) {
  const form = new FormData();
  form.append("audio", file);

  return jsonFetch<{ segments: TranscriptSegment[] }>("/api/audio/transcribe", {
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
  imagePrompt: string;
  reason: string;
}

export function reduceSegments(segments: TranscriptSegment[]) {
  return jsonFetch<{ groups: ReducedGroup[] }>("/api/audio/reduce", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ segments })
  });
}
