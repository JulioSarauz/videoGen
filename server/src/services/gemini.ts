import { env } from "../config/env.js";

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
  imagePrompt: string;
}

export interface ReducedGroup {
  segmentIndices: number[];
  start: number;
  end: number;
  text: string;
  imagePrompt: string;
  reason: string;
}

export class GeminiError extends Error {
  constructor(
    message: string,
    public readonly status?: number
  ) {
    super(message);
  }
}

async function callGeminiJson(parts: unknown[], responseSchema: unknown): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${env.geminiModel}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": env.geminiApiKey
      },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema
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
    throw new GeminiError("Gemini no devolvio contenido.");
  }
  return rawText;
}

// --- Transcripcion ---

const TRANSCRIBE_PROMPT = [
  "Transcribe el audio de este archivo completo (puede ser un audio o un video).",
  "Divide la transcripcion en segmentos por frase coherente: corta cada segmento",
  "donde una idea/frase termina de forma natural, no en intervalos de tiempo fijos.",
  "Para cada segmento da el tiempo de inicio y fin en segundos (numeros, con decimales si aplica),",
  "el texto exacto de lo que se dice, y un 'imagePrompt': una descripcion visual rica en ingles,",
  "lista para usar en un generador de imagenes, que represente la escena/idea de esa frase",
  "(no traducir literal, describir visualmente el contenido/contexto de la frase)."
].join(" ");

const TRANSCRIBE_SCHEMA = {
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

async function transcribeOnce(audioBuffer: Buffer, mimeType: string): Promise<TranscriptSegment[]> {
  const rawText = await callGeminiJson(
    [
      { text: TRANSCRIBE_PROMPT },
      { inlineData: { mimeType, data: audioBuffer.toString("base64") } }
    ],
    TRANSCRIBE_SCHEMA
  );
  return JSON.parse(rawText) as TranscriptSegment[];
}

export async function transcribeAudioWithSegments(
  audioBuffer: Buffer,
  mimeType: string
): Promise<TranscriptSegment[]> {
  try {
    return await transcribeOnce(audioBuffer, mimeType);
  } catch (err) {
    const audioFallback = VIDEO_TO_AUDIO_FALLBACK[mimeType];
    if (err instanceof GeminiError && err.status === 400 && audioFallback) {
      return await transcribeOnce(audioBuffer, audioFallback);
    }
    throw err;
  }
}

// --- Reduccion de cuadros (agrupar segmentos que hablan de lo mismo) ---

const REDUCE_PROMPT = [
  "Te doy una lista de segmentos transcritos de un audio/video, cada uno con su indice original,",
  "tiempo de inicio/fin, texto y un prompt de imagen.",
  "Tu tarea: agrupar los segmentos que hablan del mismo tema/idea visual, de forma que un solo",
  "cuadro/imagen pueda representar a todo el grupo (para ahorrar fotogramas a generar).",
  "No agrupes segmentos que traten temas o escenas visualmente distintas, aunque esten seguidos.",
  "Un segmento sin nada con que agruparse queda solo en su propio grupo.",
  "Para cada grupo resultante da: 'segmentIndices' (los indices originales que agrupaste),",
  "'start' (el menor start del grupo), 'end' (el mayor end del grupo), 'text' (resumen breve",
  "de lo que cubre el grupo), 'imagePrompt' (un prompt de imagen unico en ingles que represente",
  "bien a todo el grupo) y 'reason' (explica en español, en 1-2 frases, por que se agruparon esos",
  "segmentos o por que este segmento se dejo solo).",
  "Devuelve los grupos ordenados por 'start'. Los segmentos son:"
].join(" ");

const REDUCE_SCHEMA = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: {
      segmentIndices: { type: "ARRAY", items: { type: "INTEGER" } },
      start: { type: "NUMBER" },
      end: { type: "NUMBER" },
      text: { type: "STRING" },
      imagePrompt: { type: "STRING" },
      reason: { type: "STRING" }
    },
    required: ["segmentIndices", "start", "end", "text", "imagePrompt", "reason"]
  }
};

export async function reduceSegments(segments: TranscriptSegment[]): Promise<ReducedGroup[]> {
  const indexed = segments.map((s, index) => ({ index, ...s }));
  const rawText = await callGeminiJson(
    [{ text: `${REDUCE_PROMPT}\n${JSON.stringify(indexed)}` }],
    REDUCE_SCHEMA
  );
  return JSON.parse(rawText) as ReducedGroup[];
}
