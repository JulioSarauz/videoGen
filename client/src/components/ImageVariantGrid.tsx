import { useState } from "react";

function downloadImage(url: string, filename: string) {
  fetch(url)
    .then((res) => res.blob())
    .then((blob) => {
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    })
    .catch(() => {
      // Si el navegador bloquea leer el blob cross-origin, al menos abrimos
      // la imagen en una pestana nueva para que se pueda guardar a mano.
      window.open(url, "_blank");
    });
}

export default function ImageVariantGrid({ images }: { images: string[] }) {
  const [zoomedSrc, setZoomedSrc] = useState<string | null>(null);

  return (
    <>
      <div className="image-variants">
        {images.map((src, i) => (
          <div key={i} className="image-variant">
            <img src={src} alt={`Variante ${i + 1}`} loading="lazy" />
            <div className="image-variant-actions">
              <button type="button" onClick={() => setZoomedSrc(src)}>
                Ampliar
              </button>
              <button type="button" onClick={() => downloadImage(src, `variante-${i + 1}.jpg`)}>
                Descargar
              </button>
            </div>
          </div>
        ))}
      </div>

      {zoomedSrc && (
        <div className="lightbox" onClick={() => setZoomedSrc(null)}>
          <button
            type="button"
            className="lightbox-close"
            onClick={() => setZoomedSrc(null)}
            aria-label="Cerrar"
          >
            ✕
          </button>
          <img src={zoomedSrc} alt="Vista ampliada" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </>
  );
}
