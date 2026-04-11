import { z } from "zod";

export const CheckinMessageSchema = z.object({
  role: z.enum(["system", "user", "assistant", "tool"]),
  content: z.union([z.string(), z.array(z.unknown())]),
});

export const CheckinRequestSchema = z.object({
  messages: z.array(CheckinMessageSchema).min(1),
  transcript: z.string().min(1).max(20000).optional(),
});

export type CheckinRequest = z.infer<typeof CheckinRequestSchema>;
