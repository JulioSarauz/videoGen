import { useState } from "react";
import { generateSegmentImages } from "../api";

export function useImageVariants(initialPrompt: string) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [images, setImages] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const result = await generateSegmentImages(prompt);
      setImages(result.images);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error generando imagenes.");
    } finally {
      setLoading(false);
    }
  }

  return { prompt, setPrompt, images, loading, error, generate };
}
