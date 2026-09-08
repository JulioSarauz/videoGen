import { useState } from "react";

export function useFileDrop(onFile: (file: File) => void) {
  const [isDragging, setIsDragging] = useState(false);

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function onDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  }

  return { isDragging, dropHandlers: { onDragOver, onDragLeave, onDrop } };
}
