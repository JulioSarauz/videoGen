import { useState } from "react";
import {
  logout,
  reduceSegments as reduceSegmentsApi,
  transcribeAudio,
  type ReducedGroup,
  type TranscriptSegment
} from "../api";
import { useFileDrop } from "../hooks/useFileDrop";
import ReducedCard from "./ReducedCard";
import SegmentCard from "./SegmentCard";
import Tabs from "./Tabs";

type Tab = "original" | "reduced";

export default function AudioModule({ onBack }: { onBack: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [segments, setSegments] = useState<TranscriptSegment[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [reducedGroups, setReducedGroups] = useState<ReducedGroup[] | null>(null);
  const [reducing, setReducing] = useState(false);
  const [reduceError, setReduceError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("original");

  const { isDragging, dropHandlers } = useFileDrop(setFile);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Selecciona un archivo de audio primero.");
      return;
    }
    setError(null);
    setLoading(true);
    setSegments(null);
    setReducedGroups(null);
    setActiveTab("original");
    try {
      const result = await transcribeAudio(file);
      setSegments(result.segments);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al transcribir el audio.");
    } finally {
      setLoading(false);
    }
  }

  async function handleReduce() {
    if (!segments) return;
    setReducing(true);
    setReduceError(null);
    try {
      const result = await reduceSegmentsApi(segments);
      setReducedGroups(result.groups);
      setActiveTab("reduced");
    } catch (err) {
      setReduceError(err instanceof Error ? err.message : "Error reduciendo cuadros.");
    } finally {
      setReducing(false);
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
        <label className={`dropzone${isDragging ? " dropzone-active" : ""}`} {...dropHandlers}>
          <span>
            {file ? file.name : "Selecciona o arrastra un archivo de audio o video (mp3, wav, mp4, etc.)"}
          </span>
          <input
            type="file"
            accept="audio/*,video/mp4,video/quicktime,video/webm,video/3gpp"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>

        {error && <p className="error">{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? "Transcribiendo..." : "Transcribir"}
        </button>
      </form>

      {segments && (
        <>
          <p className="segment-count">Se generaron {segments.length} cuadros.</p>

          {reducedGroups && (
            <Tabs
              tabs={[
                { key: "original", label: `Cuadros originales (${segments.length})` },
                { key: "reduced", label: `Reducido (${reducedGroups.length})` }
              ]}
              active={activeTab}
              onChange={(key) => setActiveTab(key as Tab)}
            />
          )}

          {activeTab === "original" && (
            <>
              <div className="segments-list">
                {segments.map((segment, i) => (
                  <SegmentCard key={i} segment={segment} index={i} total={segments.length} />
                ))}
              </div>

              <div className="reduce-action">
                {reduceError && <p className="error">{reduceError}</p>}
                <button type="button" onClick={handleReduce} disabled={reducing}>
                  {reducing ? "Analizando y reduciendo..." : "Reducir"}
                </button>
              </div>
            </>
          )}

          {activeTab === "reduced" && reducedGroups && (
            <div className="segments-list">
              {reducedGroups.map((group, i) => (
                <ReducedCard key={i} group={group} index={i} total={reducedGroups.length} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
