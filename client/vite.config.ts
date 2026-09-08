import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// El backend Express sirve el build de este cliente desde el mismo proceso
// (monolito). En dev, Vite corre aparte y proxya /api hacia el server.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Siempre escucha en la red local (equivalente a --host), sin depender
    // de pasar el flag a traves de dos capas de "npm run" (root -> workspace),
    // donde el forwarding de argumentos no llega hasta vite de forma fiable.
    host: true,
    proxy: {
      "/api": {
        target: "http://localhost:3100",
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: "dist"
  }
});
