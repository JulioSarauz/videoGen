import { env } from "../config/env.js";
import { recordGeminiCall } from "./geminiQuota.js";

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
  imagePromptEn: string;
  imagePromptEs: string;
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

  // Solo contamos llamadas exitosas: un 429 por cuota excedida ya viene
  // rechazado por Google antes de consumir cupo real.
  recordGeminiCall();

  const json = await res.json();
  const rawText: string | undefined = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    throw new GeminiError("Gemini no devolvio contenido.");
  }
  return rawText;
}

// --- Transcripcion ---

// Reglas de estilo aplicadas a TODOS los prompts de imagen que Gemini genera
// (transcripcion y reduccion), para que la primera generacion ya salga bien
// y no haya que estar regenerando por resultados fuera de tono.
const IMAGE_STYLE_RULES = [
  "Reglas de estilo OBLIGATORIAS para cada prompt de imagen que generes:",
  "1) Si la escena incluye personas, deben tener apariencia latina, especificamente ecuatoriana",
  "(rasgos mestizos andinos o costeños de Ecuador), con vestimenta, entorno y detalles culturales",
  "propios de Ecuador cuando la escena lo permita (nunca personas de otras etnias o nacionalidades).",
  "2) Si la escena incluye cualquier texto legible (infografias, carteles, letreros, titulos,",
  "etiquetas, texto en pantallas o rotulos), ese texto SIEMPRE debe estar escrito en español, nunca",
  "en ingles: escribe el texto exacto a mostrar entre comillas dentro del prompt.",
  "3) Enriquece cada prompt con el maximo detalle visual posible: iluminacion, estilo (foto",
  "realista, ilustracion, etc segun corresponda), composicion y encuadre de camara, paleta de",
  "colores, atmosfera/estado de animo. El objetivo es que el generador de imagenes no tenga",
  "ambiguedad y acierte en el primer intento.",
  "4) 'imagePromptEn' se sigue escribiendo mayormente en ingles (mejor comprension del modelo de",
  "imagen), PERO las reglas 1 y 2 aplican igual: las personas siguen siendo de apariencia",
  "ecuatoriana, y cualquier texto a renderizar en la imagen va en español entre comillas aunque",
  "el resto del prompt este en ingles.",
  "5) 'imagePromptEs' es la misma descripcion completa en español natural (no traduccion literal",
  "palabra por palabra), cumpliendo las mismas reglas 1-3."
].join(" ");

const TRANSCRIBE_PROMPT = [
  "Transcribe el audio de este archivo completo (puede ser un audio o un video).",
  "Divide la transcripcion en segmentos por frase coherente: corta cada segmento",
  "donde una idea/frase termina de forma natural, no en intervalos de tiempo fijos.",
  "Para cada segmento da el tiempo de inicio y fin en segundos (numeros, con decimales si aplica)",
  "y el texto exacto de lo que se dice.",
  "Ademas, para cada segmento escribe un prompt de imagen usando el CONTEXTO COMPLETO del audio:",
  "ten en cuenta el tema general, quien habla, el tono, y lo que se dijo antes y despues de ese",
  "segmento (no solo la frase aislada), para que la escena visual tenga coherencia con el resto",
  "del contenido y no luzca generica o desconectada.",
  "Da ese prompt en dos versiones: 'imagePromptEn' e 'imagePromptEs'.",
  IMAGE_STYLE_RULES
].join(" ");

const TRANSCRIBE_SCHEMA = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: {
      start: { type: "NUMBER" },
      end: { type: "NUMBER" },
      text: { type: "STRING" },
      imagePromptEn: { type: "STRING" },
      imagePromptEs: { type: "STRING" }
    },
    required: ["start", "end", "text", "imagePromptEn", "imagePromptEs"]
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
  "tiempo de inicio/fin, texto y prompts de imagen (ingles y español).",
  "Tu tarea: agrupar los segmentos que hablan del mismo tema/idea visual, de forma que un solo",
  "cuadro/imagen pueda representar a todo el grupo (para ahorrar fotogramas a generar).",
  "No agrupes segmentos que traten temas o escenas visualmente distintas, aunque esten seguidos.",
  "Un segmento sin nada con que agruparse queda solo en su propio grupo.",
  "Para cada grupo resultante da: 'segmentIndices' (los indices originales que agrupaste),",
  "'start' (el menor start del grupo), 'end' (el mayor end del grupo), 'text' (resumen breve",
  "de lo que cubre el grupo), 'imagePromptEn', 'imagePromptEs' (un prompt de imagen unico usando",
  "el contexto completo del grupo, que represente bien a todo el grupo) y 'reason' (explica en",
  "español, en 1-2 frases, por que se agruparon esos segmentos o por que este segmento se dejo solo).",
  IMAGE_STYLE_RULES,
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
      imagePromptEn: { type: "STRING" },
      imagePromptEs: { type: "STRING" },
      reason: { type: "STRING" }
    },
    required: [
      "segmentIndices",
      "start",
      "end",
      "text",
      "imagePromptEn",
      "imagePromptEs",
      "reason"
    ]
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
