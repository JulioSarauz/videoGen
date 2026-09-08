export interface GenerateVideoInput {
  imageBuffer: Buffer;
  imageFormat: string;
  /** Instruccion de movimiento del usuario, ya envuelta para restringir cambios de contenido. */
  prompt: string;
  /** 0-1: que tan libre es el modelo para moverse. Bajo = mas fiel a la imagen original. */
  motionStrength: number;
  durationSeconds: number;
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
}

export interface VideoProvider {
  submit(input: GenerateVideoInput): Promise<GenerateVideoJob>;
  poll(providerJobId: string): Promise<JobResult>;
}
