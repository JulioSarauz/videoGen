import { randomUUID } from "node:crypto";

interface StoredJob {
  providerJobId: string;
  originalImageBuffer: Buffer;
  createdAt: number;
}

// Almacen en memoria: suficiente para un equipo pequeno/privado sin base de
// datos. Si el proceso se reinicia se pierden los jobs en curso (el usuario
// simplemente vuelve a generar). Si se necesita persistencia entre reinicios
// o multiples instancias, reemplazar por Redis/SQLite.
const jobs = new Map<string, StoredJob>();

const JOB_TTL_MS = 1000 * 60 * 60; // 1h

export function createJob(providerJobId: string, originalImageBuffer: Buffer): string {
  const jobId = randomUUID();
  jobs.set(jobId, { providerJobId, originalImageBuffer, createdAt: Date.now() });
  return jobId;
}

export function getJob(jobId: string): StoredJob | undefined {
  cleanup();
  return jobs.get(jobId);
}

function cleanup() {
  const now = Date.now();
  for (const [id, job] of jobs) {
    if (now - job.createdAt > JOB_TTL_MS) {
      jobs.delete(id);
    }
  }
}
