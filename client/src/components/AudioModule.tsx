import { useState } from "react";
import { logout, transcribeAudio, type TranscriptSegment } from "../api";
import SegmentCard from "./SegmentCard";

export default function AudioModule({ onBack }: { onBack: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [segments, setSegments] = useState<TranscriptSegment[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Selecciona un archivo de audio primero.");
      return;
    }
    setError(null);
    setLoading(true);
    setSegments(null);
    try {
      const result = await transcribeAudio(file);
      setSegments(result.segments);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al transcribir el audio.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="generator">
      <header>
        <button className="link" onClick={onBack}>
          ← Menu
        </button>
        <h1>Analizar Audio</h1>
        <button className="link" onClick={() => logout().then(() => window.location.reload())}>
          Cerrar sesion
        </button>
      </header>

      <form onSubmit={handleSubmit} className="generator-form">
        <label className="dropzone">
          <span>{file ? file.name : "Selecciona un archivo de audio (mp3, wav, etc.)"}</span>
          <input
            type="file"
            accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/mp4,audio/aac,audio/ogg,audio/flac,audio/webm"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>

        {error && <p className="error">{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? "Transcribiendo..." : "Transcribir"}
        </button>
      </form>

      {segments && (
        <div className="segments-list">
          {segments.map((segment, i) => (
            <SegmentCard key={i} segment={segment} />
          ))}
        </div>
      )}
    </div>
  );
}
