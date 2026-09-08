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

export class GeminiError extends Error {}

export async function transcribeAudioWithSegments(
  audioBuffer: Buffer,
  mimeType: string
): Promise<TranscriptSegment[]> {
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
    throw new GeminiError(`Gemini API respondio ${res.status}: ${body}`);
  }

  const json = await res.json();
  const rawText: string | undefined = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    throw new GeminiError("Gemini no devolvio contenido transcribible.");
  }

  const segments = JSON.parse(rawText) as TranscriptSegment[];
  return segments;
}
