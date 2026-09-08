import { env } from "../config/env.js";

// Contador aproximado en memoria del uso diario de Gemini. La cuota real es
// por proyecto/API key (compartida entre todos los que usen esta app, no por
// navegador), asi que se lleva del lado del servidor. Se reinicia solo al
// cambiar el dia UTC, y tambien si el proceso se reinicia (no persiste entre
// deploys) - es una guia aproximada, no la fuente de verdad de Google.
let currentDay = todayKey();
let used = 0;

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function ensureFreshDay() {
  const key = todayKey();
  if (key !== currentDay) {
    currentDay = key;
    used = 0;
  }
}

export function recordGeminiCall(): void {
  ensureFreshDay();
  used += 1;
}

export interface GeminiUsage {
  used: number;
  limit: number;
  date: string;
}

export function getGeminiUsage(): GeminiUsage {
  ensureFreshDay();
  return { used, limit: env.geminiDailyQuota, date: currentDay };
}
