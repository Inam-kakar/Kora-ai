import { generateObject } from "ai";
import { z } from "zod";

import { geminiFlash } from "@/lib/gemini";
import { TRIGGER_DETECTION_PROMPT } from "@/lib/prompts";
import type { TriggerResult } from "@/types/agents";

const TriggerSchema = z.object({
  shouldAlert: z.boolean(),
  urgency: z.enum(["low", "medium", "high", "critical"]).optional(),
  matchedPattern: z
    .object({
      id: z.string(),
      title: z.string(),
      similarity: z.number(),
    })
    .optional(),
  alertMessage: z.string().optional(),
  memoriesToReplay: z.array(z.string()).optional(),
});

export async function runTriggerAgent(
  currentSummary: string,
  matchingPatterns: object[],
  relevantMemories: object[]
): Promise<TriggerResult> {
  const { object } = await generateObject({
    model: geminiFlash(),
    schema: TriggerSchema,
    system: TRIGGER_DETECTION_PROMPT,
    prompt: JSON.stringify({
      currentSummary,
      matchingPatterns,
      relevantMemories,
    }),
    providerOptions: {
      vertex: {
        streamFunctionCallArguments: false,
      },
    },
    maxOutputTokens: 1000,
    temperature: 0.3,
  });

  return object;
}
