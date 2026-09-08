import type { ReducedGroup } from "../api";
import { useImageVariants } from "../hooks/useImageVariants";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function ReducedCard({ group, index, total }: { group: ReducedGroup; index: number; total: number }) {
  const { prompt, setPrompt, images, loading, error, generate } = useImageVariants(group.imagePrompt);

  const originalLabel =
    group.segmentIndices.length > 1
      ? `Combina los cuadros originales ${group.segmentIndices.map((i) => i + 1).join(", ")}`
      : `Cuadro original ${group.segmentIndices[0] + 1}, sin combinar`;

  return (
    <div className="segment-card">
      <h3>
        Cuadro reducido {index + 1} de {total} — {formatTime(group.start)} - {formatTime(group.end)}
      </h3>
      <p className="segment-phrase">{originalLabel}</p>
      <p className="reduced-reason">{group.reason}</p>
      <p className="segment-phrase">"{group.text}"</p>

      <label>
        Contexto / prompt de imagen (editable)
        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} />
      </label>

      {error && <p className="error">{error}</p>}

      <button type="button" onClick={generate} disabled={loading}>
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
