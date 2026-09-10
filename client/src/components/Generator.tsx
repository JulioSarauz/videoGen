import { useEffect, useRef, useState } from "react";
import {
  getStatus,
  getVideoModels,
  logout,
  submitGeneration,
  suggestPrompts,
  type StatusResponse,
  type VideoModelInfo
} from "../api";
import { useFileDrop } from "../hooks/useFileDrop";
import { estimateVideoCost } from "../utils/videoPricing";

const POLL_INTERVAL_MS = 4000;

function pickDefault<T>(options: T[], preferred: T[]): T | undefined {
  for (const p of preferred) {
    if (options.includes(p)) return p;
  }
  return options[0];
}

export default function Generator({ onBack }: { onBack: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [motionStrength, setMotionStrength] = useState(0.3);

  const [models, setModels] = useState<VideoModelInfo[] | null>(null);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [modelId, setModelId] = useState<string>("");
  const [durationSeconds, setDurationSeconds] = useState(5);
  const [resolution, setResolution] = useState<string>("");
  const [aspectRatio, setAspectRatio] = useState<string>("");
  const [generateAudio, setGenerateAudio] = useState(false);

  const [suggestions, setSuggestions] = useState<string[] | null>(null);
  const [suggestingPrompt, setSuggestingPrompt] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);

  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    getVideoModels()
      .then(({ models: list }) => {
        setModels(list);
        if (list.length > 0) applyModelDefaults(list[0]);
      })
      .catch((err) => setModelsError(err instanceof Error ? err.message : "No se pudo cargar el catalogo de modelos."));
  }, []);

  function applyModelDefaults(model: VideoModelInfo) {
    setModelId(model.id);
    setDurationSeconds(pickDefault(model.supportedDurations, [5]) ?? 5);
    setResolution(pickDefault(model.supportedResolutions, ["1080p", "720p"]) ?? "");
    setAspectRatio(pickDefault(model.supportedAspectRatios, ["16:9"]) ?? "");
    setGenerateAudio(false);
  }

  function handleModelChange(id: string) {
    const model = models?.find((m) => m.id === id);
    if (model) applyModelDefaults(model);
  }

  const selectedModel = models?.find((m) => m.id === modelId);
  const estimatedCost = selectedModel
    ? estimateVideoCost(selectedModel.pricingSkus, {
        durationSeconds,
        resolution,
        aspectRatio,
        generateAudio: generateAudio && selectedModel.generateAudioSupported
      })
    : null;

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

  async function handleSuggestPrompts() {
    setSuggestError(null);
    setSuggestingPrompt(true);
    try {
      const { suggestions: list } = await suggestPrompts(prompt);
      setSuggestions(list);
    } catch (err) {
      setSuggestError(err instanceof Error ? err.message : "No se pudieron generar sugerencias.");
    } finally {
      setSuggestingPrompt(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Selecciona una imagen primero.");
      return;
    }
    if (!modelId) {
      setError("Selecciona un modelo de video.");
      return;
    }
    setError(null);
    setSubmitting(true);
    setStatus(null);
    try {
      const { jobId } = await submitGeneration({
        file,
        prompt,
        motionStrength,
        durationSeconds,
        model: modelId,
        resolution: resolution || undefined,
        aspectRatio: aspectRatio || undefined,
        generateAudio: generateAudio && !!selectedModel?.generateAudioSupported
      });
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
          <span className="material-symbols-rounded">arrow_back</span> Menu
        </button>
        <h1>Generar Video</h1>
        <button className="link" onClick={() => logout().then(() => window.location.reload())}>
          Cerrar sesion
        </button>
      </header>

      <form onSubmit={handleSubmit} className="synth-rack">
        <div className="panel panel-wide">
          <p className="panel-title">
            <span className="material-symbols-rounded">image</span> Imagen de origen
          </p>
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
        </div>

        <div className="panel">
          <p className="panel-title">
            <span className="material-symbols-rounded">smart_display</span> Modelo & calidad
          </p>

          {modelsError && <p className="error">{modelsError}</p>}

          <div className="field">
            <span>Modelo de video</span>
            <select value={modelId} onChange={(e) => handleModelChange(e.target.value)} disabled={!models}>
              {!models && <option>Cargando modelos...</option>}
              {models?.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            {selectedModel?.description && <small>{selectedModel.description}</small>}
          </div>

          {selectedModel && (
            <>
              <div className="field">
                <span>Duracion</span>
                <select value={durationSeconds} onChange={(e) => setDurationSeconds(Number(e.target.value))}>
                  {selectedModel.supportedDurations.map((d) => (
                    <option key={d} value={d}>
                      {d}s
                    </option>
                  ))}
                </select>
              </div>

              {selectedModel.supportedResolutions.length > 0 && (
                <div className="field">
                  <span>Resolucion</span>
                  <select value={resolution} onChange={(e) => setResolution(e.target.value)}>
                    {selectedModel.supportedResolutions.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {selectedModel.supportedAspectRatios.length > 0 && (
                <div className="field">
                  <span>Relacion de aspecto</span>
                  <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)}>
                    {selectedModel.supportedAspectRatios.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <label className="switch-label">
                <span className="switch">
                  <input
                    type="checkbox"
                    checked={generateAudio}
                    disabled={!selectedModel.generateAudioSupported}
                    onChange={(e) => setGenerateAudio(e.target.checked)}
                  />
                  <span className="switch-track" />
                </span>
                <span>
                  Generar con audio
                  {!selectedModel.generateAudioSupported && <small> (no soportado por este modelo)</small>}
                </span>
              </label>

              {estimatedCost !== null && (
                <p className="cost-estimate">
                  Costo estimado: <strong>~${estimatedCost.toFixed(4)} USD</strong>
                  <br />
                  <small>A partir del catalogo de OpenRouter; el costo real puede variar.</small>
                </p>
              )}
            </>
          )}
        </div>

        <div className="panel">
          <p className="panel-title">
            <span className="material-symbols-rounded">tune</span> Movimiento
          </p>

          <div className="field">
            <span className="field-row">
              <span>Intensidad</span>
              <span className="field-value">{motionStrength.toFixed(2)}</span>
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={motionStrength}
              onChange={(e) => setMotionStrength(Number(e.target.value))}
            />
            <small>Mas bajo = mas fiel a la imagen original (recomendado para texto/logos).</small>
          </div>
        </div>

        <div className="panel panel-wide">
          <p className="panel-title">
            <span className="material-symbols-rounded">edit_note</span> Prompt de movimiento
          </p>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ej: mueve solo las nubes de fondo lentamente hacia la derecha"
            rows={3}
          />

          <div className="prompt-suggestions">
            <button type="button" className="btn-ghost" onClick={handleSuggestPrompts} disabled={suggestingPrompt}>
              <span className="material-symbols-rounded">auto_awesome</span>
              {suggestingPrompt ? "Pensando..." : "Sugerir variantes"}
            </button>
            {suggestError && <p className="error">{suggestError}</p>}
            {suggestions && suggestions.length > 0 && (
              <ul className="suggestion-list">
                {suggestions.map((s, i) => (
                  <li key={i}>
                    <button type="button" className="link" onClick={() => setPrompt(s)}>
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {error && <p className="error panel-wide">{error}</p>}

        <div className="submit-row panel-wide">
          <button type="submit" className="btn-synth" disabled={submitting}>
            {submitting ? "Enviando..." : "Generar video"}
          </button>
        </div>
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
          {typeof status.costUsd === "number" && (
            <p>
              Costo real cobrado: <strong>${status.costUsd.toFixed(4)} USD</strong>
            </p>
          )}
          {status.videoUrl && <video src={status.videoUrl} controls style={{ maxWidth: "100%" }} />}
        </div>
      )}
    </div>
  );
}
