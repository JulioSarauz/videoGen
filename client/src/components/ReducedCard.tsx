import { useState } from "react";
import type { ReducedGroup } from "../api";
import { useImageVariants } from "../hooks/useImageVariants";
import AccordionItem from "./AccordionItem";
import ImageVariantGrid from "./ImageVariantGrid";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function ReducedCard({
  group,
  index,
  total,
  isOpen,
  onToggle
}: {
  group: ReducedGroup;
  index: number;
  total: number;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const { prompt, setPrompt, images, loading, error, generate } = useImageVariants(
    group.imagePromptEn
  );
  const [promptEs, setPromptEs] = useState(group.imagePromptEs);

  const originalLabel =
    group.segmentIndices.length > 1
      ? `Combina los cuadros originales ${group.segmentIndices.map((i) => i + 1).join(", ")}`
      : `Cuadro original ${group.segmentIndices[0] + 1}, sin combinar`;

  const title = (
    <span>
      Cuadro reducido {index + 1} de {total} — {formatTime(group.start)} - {formatTime(group.end)}
    </span>
  );

  return (
    <AccordionItem title={title} isOpen={isOpen} onToggle={onToggle}>
      <p className="segment-phrase">{originalLabel}</p>
      <p className="reduced-reason">{group.reason}</p>
      <p className="segment-phrase">"{group.text}"</p>

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
