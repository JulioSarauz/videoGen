export interface GenerateVideoInput {
  imageBuffer: Buffer;
  imageFormat: string;
  /** Instruccion de movimiento del usuario, ya envuelta para restringir cambios de contenido. */
  prompt: string;
  /** 0-1: que tan libre es el modelo para moverse. Bajo = mas fiel a la imagen original. */
  motionStrength: number;
  durationSeconds: number;
  /** Slug de modelo de OpenRouter (ej. "google/veo-3.1-fast"), elegido en el selector del cliente. */
  model: string;
  resolution?: string;
  aspectRatio?: string;
  generateAudio?: boolean;
}

export type JobStatus = "queued" | "processing" | "succeeded" | "failed";

export interface GenerateVideoJob {
  providerJobId: string;
}

export interface JobResult {
  status: JobStatus;
  videoUrl?: string;
  coverImageUrl?: string;
  error?: string;
  /** Costo real cobrado por el proveedor (USD), cuando lo informa al completar. */
  costUsd?: number;
}

export interface VideoProvider {
  submit(input: GenerateVideoInput): Promise<GenerateVideoJob>;
  poll(providerJobId: string): Promise<JobResult>;
}
