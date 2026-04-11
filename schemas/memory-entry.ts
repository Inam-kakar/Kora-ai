import { z } from "zod";

export const MemoryIngestSchema = z.object({
  sessionId: z.string().min(1),
  transcript: z.string().min(1).max(20000),
});

export type MemoryIngestPayload = z.infer<typeof MemoryIngestSchema>;
