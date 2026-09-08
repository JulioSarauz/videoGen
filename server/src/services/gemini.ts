import { env } from "../config/env.js";

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
  imagePrompt: string;
}

const SYSTEM_PROMPT = [
  "Transcribe el audio de este archivo completo (puede ser un audio o un video).",
  "Divide la transcripcion en segmentos por frase coherente: corta cada segmento",
  "donde una idea/frase termina de forma natural, no en intervalos de tiempo fijos.",
  "Para cada segmento da el tiempo de inicio y fin en segundos (numeros, con decimales si aplica),",
  "el texto exacto de lo que se dice, y un 'imagePrompt': una descripcion visual rica en ingles,",
  "lista para usar en un generador de imagenes, que represente la escena/idea de esa frase",
  "(no traducir literal, describir visualmente el contenido/contexto de la frase)."
].join(" ");

const RESPONSE_SCHEMA = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: {
      start: { type: "NUMBER" },
      end: { type: "NUMBER" },
      text: { type: "STRING" },
      imagePrompt: { type: "STRING" }
    },
    required: ["start", "end", "text", "imagePrompt"]
  }
};

// Si el video viene con un codec/mux raro (comun en exports de WhatsApp),
// Gemini a veces falla al decodificar frames aunque el audio este perfecto.
// En ese caso reintentamos el mismo archivo indicandole que es solo audio,
// asi Gemini se salta el decodificador de video y lee directo la pista de audio.
const VIDEO_TO_AUDIO_FALLBACK: Record<string, string> = {
  "video/mp4": "audio/mp4",
  "video/quicktime": "audio/mp4",
  "video/webm": "audio/webm",
  "video/3gpp": "audio/3gpp",
  "video/mpeg": "audio/mpeg",
  "video/x-msvideo": "audio/mp4",
  "video/x-matroska": "audio/mp4"
};

export class GeminiError extends Error {
  constructor(
    message: string,
    public readonly status?: number
  ) {
    super(message);
  }
}

async function callGemini(audioBuffer: Buffer, mimeType: string): Promise<TranscriptSegment[]> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${env.geminiModel}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": env.geminiApiKey
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: SYSTEM_PROMPT },
              { inlineData: { mimeType, data: audioBuffer.toString("base64") } }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA
        }
      })
    }
  );

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new GeminiError(`Gemini API respondio ${res.status}: ${body}`, res.status);
  }

  const json = await res.json();
  const rawText: string | undefined = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    throw new GeminiError("Gemini no devolvio contenido transcribible.");
  }

  return JSON.parse(rawText) as TranscriptSegment[];
}

export async function transcribeAudioWithSegments(
  audioBuffer: Buffer,
  mimeType: string
): Promise<TranscriptSegment[]> {
  try {
    return await callGemini(audioBuffer, mimeType);
  } catch (err) {
    const audioFallback = VIDEO_TO_AUDIO_FALLBACK[mimeType];
    if (err instanceof GeminiError && err.status === 400 && audioFallback) {
      return await callGemini(audioBuffer, audioFallback);
    }
    throw err;
  }
}
