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
