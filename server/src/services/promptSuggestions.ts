import { env } from "../config/env.js";

const SYSTEM_PROMPT = [
  "Sos un asistente que mejora instrucciones de movimiento para animar una imagen fija con IA de video.",
  "Regla estricta: la imagen es la fuente de verdad. Nunca sugieras cambios de texto, letras, logos, colores ni composicion.",
  "Solo describis movimiento de camara o de elementos que ya estan en la imagen.",
  "Devolves exactamente 3 variantes, una por linea, en espanol, cortas (una oracion), sin numerarlas ni agregar texto extra."
].join(" ");

/** Usa un modelo de texto de OpenRouter (no genera video) para sugerir variantes del prompt de movimiento. */
export async function suggestPrompts(userPrompt: string): Promise<string[]> {
  const res = await fetch(`${env.openrouterBaseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.openrouterApiKey}`
    },
    body: JSON.stringify({
      model: env.openrouterTextModel,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: userPrompt.trim() || "Sugerime movimientos sutiles de camara para una foto generica."
        }
      ],
      temperature: 0.7
    })
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OpenRouter respondio ${res.status}: ${body}`);
  }

  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = json.choices?.[0]?.message?.content ?? "";

  return content
    .split("\n")
    .map((line) => line.replace(/^[-*\d.\s]+/, "").trim())
    .filter(Boolean)
    .slice(0, 3);
}
