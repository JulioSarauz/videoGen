/**
 * Envuelve la instruccion del usuario en un prompt que le deja claro al
 * modelo que la imagen es fuente de verdad: solo debe animarla segun la
 * instruccion, sin redibujar texto, logos, colores ni composicion.
 */
export function wrapMotionPrompt(userInstruction: string): string {
  const instruction = userInstruction.trim();
  return [
    "Anima esta imagen exactamente como es, sin alterar ningun elemento visual.",
    "No cambies ni redibujes texto, letras, logos, colores, proporciones ni composicion.",
    "El unico movimiento permitido es el siguiente:",
    instruction,
    "Todo lo demas debe permanecer identico al frame original."
  ].join(" ");
}
