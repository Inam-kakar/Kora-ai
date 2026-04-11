import { generateObject } from "ai";
import { z } from "zod";

import { geminiFlash } from "@/lib/gemini";
import { PATTERN_ANALYSIS_PROMPT } from "@/lib/prompts";
import type { IMemoryEntry } from "@/models/MemoryEntry";
import type { PatternAnalysisResult } from "@/types/agents";

const PatternSchema = z.object({
  patterns: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      description: z.string(),
      occurrences: z.number().int().nonnegative(),
      lastSeen: z.string(),
      severity: z.enum(["low", "medium", "high"]),
      triggerConditions: z.array(z.string()),
      historicalOutcomes: z.array(z.string()),
    })
  ),
});

type PatternAgentInputEntry = Pick<
  IMemoryEntry,
  "createdAt" | "summary" | "themes" | "emotions" | "decisionPoints" | "stressScore"
>;

export async function runPatternAgent(
  entries: PatternAgentInputEntry[]
): Promise<PatternAnalysisResult> {
  const { object } = await generateObject({
    model: geminiFlash(),
    schema: PatternSchema,
    system: PATTERN_ANALYSIS_PROMPT,
    prompt: JSON.stringify(entries),
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
