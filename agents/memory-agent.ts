import { generateObject } from "ai";
import { z } from "zod";

import { geminiFlash } from "@/lib/gemini";
import { MEMORY_EXTRACTION_PROMPT } from "@/lib/prompts";
import type { MemoryExtractionResult } from "@/types/agents";

const MemoryExtractionSchema = z.object({
  themes: z.array(z.string()).max(5),
  emotions: z.object({
    primary: z.enum([
      "stress",
      "excitement",
      "regret",
      "confidence",
      "anxiety",
      "relief",
      "guilt",
      "hope",
    ]),
    intensity: z.number().min(0).max(1),
    markers: z.array(z.string()),
  }),
  decisionPoints: z.array(
    z.object({
      type: z.enum(["investment", "loan", "purchase", "gift", "avoid", "other"]),
      amount: z.number().optional(),
      currency: z.string().optional(),
      counterparty: z.string().optional(),
      deadline: z.string().optional(),
      summary: z.string(),
    })
  ),
  stressScore: z.number().min(0).max(1),
  summary: z.string().max(200),
});

export async function runMemoryAgent(
  transcript: string
): Promise<MemoryExtractionResult> {
  const { object } = await generateObject({
    model: geminiFlash(),
    schema: MemoryExtractionSchema,
    system: MEMORY_EXTRACTION_PROMPT,
    prompt: transcript,
    providerOptions: {
      vertex: {
        streamFunctionCallArguments: false,
      },
    },
    maxOutputTokens: 1000,
    temperature: 0.3,
  });

  return {
    ...object,
    decisionPoints: object.decisionPoints.map((decisionPoint) => ({
      ...decisionPoint,
      deadline: decisionPoint.deadline
        ? new Date(decisionPoint.deadline)
        : undefined,
    })),
  };
}
