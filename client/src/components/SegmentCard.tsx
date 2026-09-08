import { useState } from "react";
import { generateSegmentImages, type TranscriptSegment } from "../api";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function SegmentCard({ segment }: { segment: TranscriptSegment }) {
  const [prompt, setPrompt] = useState(segment.imagePrompt);
  const [images, setImages] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
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

  return (
    <div className="segment-card">
      <h3>
        Tiempo {formatTime(segment.start)} - {formatTime(segment.end)}
      </h3>
      <p className="segment-phrase">"{segment.text}"</p>

      <label>
        Contexto / prompt de imagen (editable)
        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} />
      </label>

      {error && <p className="error">{error}</p>}

      <button type="button" onClick={handleGenerate} disabled={loading}>
        {loading ? "Generando..." : "Generar"}
      </button>

      {images && (
        <div className="image-variants">
          {images.map((src, i) => (
            <img key={i} src={src} alt={`Variante ${i + 1}`} loading="lazy" />
          ))}
        </div>
      )}
    </div>
  );
}
