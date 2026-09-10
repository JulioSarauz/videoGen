import { logout } from "../api";

export type ModuleKey = "video" | "audio";

const MODULES: { key: ModuleKey; title: string; description: string; icon: string }[] = [
  {
    key: "video",
    title: "Generar Video",
    description: "Sube una imagen y animala segun un prompt de movimiento.",
    icon: "movie"
  },
  {
    key: "audio",
    title: "Analizar Audio",
    description: "Transcribe un audio por frases y genera imagenes para cada momento.",
    icon: "graphic_eq"
  }
];

export default function ModuleMenu({ onSelect }: { onSelect: (module: ModuleKey) => void }) {
  return (
    <div className="menu-screen">
      <header>
        <h1>genVideo</h1>
        <button className="link" onClick={() => logout().then(() => window.location.reload())}>
          Cerrar sesion
        </button>
      </header>

      <div className="module-grid">
        {MODULES.map((mod) => (
          <button key={mod.key} className="module-tile" onClick={() => onSelect(mod.key)}>
            <span className="material-symbols-rounded">{mod.icon}</span>
            <span className="module-tile-title">{mod.title}</span>
            <span className="module-tile-desc">{mod.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
