import { useRef, useState } from "react";
import { getStatus, logout, submitGeneration, type StatusResponse } from "../api";
import { useFileDrop } from "../hooks/useFileDrop";

const POLL_INTERVAL_MS = 4000;

export default function Generator({ onBack }: { onBack: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [motionStrength, setMotionStrength] = useState(0.3);
  const [durationSeconds, setDurationSeconds] = useState(5);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  function handleFile(f: File | null) {
    setFile(f);
    setStatus(null);
    setError(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(f ? URL.createObjectURL(f) : null);
  }

  const { isDragging, dropHandlers } = useFileDrop(handleFile);

  function stopPolling() {
    if (pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
  }

  function pollJob(jobId: string) {
    stopPolling();
    pollTimer.current = setInterval(async () => {
      try {
        const result = await getStatus(jobId);
        setStatus(result);
        if (result.status === "succeeded" || result.status === "failed") {
          stopPolling();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error consultando el estado.");
        stopPolling();
      }
    }, POLL_INTERVAL_MS);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Selecciona una imagen primero.");
      return;
    }
    setError(null);
    setSubmitting(true);
    setStatus(null);
    try {
      const { jobId } = await submitGeneration({ file, prompt, motionStrength, durationSeconds });
      setStatus({ status: "queued" });
      pollJob(jobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al generar el video.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="generator">
      <header>
        <button className="link" onClick={onBack}>
          ← Menu
        </button>
        <h1>Generar Video</h1>
        <button className="link" onClick={() => logout().then(() => window.location.reload())}>
          Cerrar sesion
        </button>
      </header>

      <form onSubmit={handleSubmit} className="generator-form">
        <label className={`dropzone${isDragging ? " dropzone-active" : ""}`} {...dropHandlers}>
          {previewUrl ? (
            <img src={previewUrl} alt="Vista previa" />
          ) : (
            <span>Selecciona o arrastra una imagen (min. 1080px en el lado largo)</span>
          )}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
        </label>

        <label>
          Movimiento a aplicar
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ej: mueve solo las nubes de fondo lentamente hacia la derecha"
            rows={3}
          />
        </label>

        <label>
          Intensidad de movimiento ({motionStrength.toFixed(2)})
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={motionStrength}
            onChange={(e) => setMotionStrength(Number(e.target.value))}
          />
          <small>Mas bajo = mas fiel a la imagen original (recomendado para texto/logos).</small>
        </label>

        <label>
          Duracion (segundos)
          <input
            type="number"
            min={2}
            max={10}
            value={durationSeconds}
            onChange={(e) => setDurationSeconds(Number(e.target.value))}
          />
        </label>

        {error && <p className="error">{error}</p>}

        <button type="submit" disabled={submitting}>
          {submitting ? "Enviando..." : "Generar video"}
        </button>
      </form>

      {status && (
        <div className="status-panel">
          <p>
            Estado: <strong>{status.status}</strong>
          </p>
          {status.error && <p className="error">{status.error}</p>}
          {status.fidelity && status.fidelity.checked && (
            <p className={status.fidelity.passed ? "ok" : "warn"}>
              Chequeo de fidelidad: diff {status.fidelity.diffScore?.toFixed(3)} -{" "}
              {status.fidelity.passed ? "OK" : "revisar, posible distorsion"}
            </p>
          )}
          {status.videoUrl && (
            <video src={status.videoUrl} controls style={{ maxWidth: "100%" }} />
          )}
        </div>
      )}
    </div>
  );
}
