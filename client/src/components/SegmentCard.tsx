import { useState } from "react";
import type { TranscriptSegment } from "../api";
import { useImageVariants } from "../hooks/useImageVariants";
import AccordionItem from "./AccordionItem";
import ImageVariantGrid from "./ImageVariantGrid";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function SegmentCard({
  segment,
  index,
  total,
  isOpen,
  onToggle
}: {
  segment: TranscriptSegment;
  index: number;
  total: number;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const { prompt, setPrompt, images, loading, error, generate } = useImageVariants(
    segment.imagePromptEn
  );
  const [promptEs, setPromptEs] = useState(segment.imagePromptEs);

  const title = (
    <span>
      Cuadro {index + 1} de {total} — {formatTime(segment.start)} - {formatTime(segment.end)}
    </span>
  );

  return (
    <AccordionItem title={title} isOpen={isOpen} onToggle={onToggle}>
      <p className="segment-phrase">"{segment.text}"</p>

      <label>
        Prompt de imagen (ingles) — se usa para generar
        <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} />
      </label>

      <label>
        Contexto (español)
        <textarea value={promptEs} onChange={(e) => setPromptEs(e.target.value)} rows={3} />
      </label>

      {error && <p className="error">{error}</p>}

      <button type="button" className="btn-synth" onClick={generate} disabled={loading}>
        {loading ? "Generando..." : "Generar"}
      </button>

      {images && <ImageVariantGrid images={images} />}
    </AccordionItem>
  );
}
