// Copia el build del cliente (Vite) dentro del bundle del servidor
// para que Express lo sirva como estatico desde un unico proceso (monolito).
import { cpSync, existsSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, "..", "..", "client", "dist");
const serverPublic = path.resolve(__dirname, "..", "dist", "public");

if (!existsSync(clientDist)) {
  console.error(
    `No se encontro el build del cliente en ${clientDist}. Ejecuta "npm run build:client" primero.`
  );
  process.exit(1);
}

rmSync(serverPublic, { recursive: true, force: true });
cpSync(clientDist, serverPublic, { recursive: true });
console.log(`Cliente copiado a ${serverPublic}`);
