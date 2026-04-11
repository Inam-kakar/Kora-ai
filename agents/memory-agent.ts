import { generateObject } from "ai";
import { z } from "zod";

import { geminiFlash } from "@/lib/gemini";
import { MEMORY_EXTRACTION_PROMPT } from "@/lib/prompts";
import type { MemoryExtractionResult } from "@/types/agents";

const MemoryExtractionSchema = z.object({
  themes: z.array(z.string()),
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
    intensity: z.number(),
    markers: z.array(z.string()),
  }),
  decisionPoints: z.array(
    z.object({
      type: z.string(),
      amount: z.number().nullable().optional(),
      currency: z.string().nullable().optional(),
      counterparty: z.string().nullable().optional(),
      deadline: z.string().nullable().optional(),
      summary: z.string(),
    })
  ),
  stressScore: z.number(),
  summary: z.string(),
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
