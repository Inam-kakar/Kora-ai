import { generateObject } from "ai";
import { z } from "zod";

import { geminiFlash } from "@/lib/gemini";
import { EMOTION_AGENT_PROMPT } from "@/lib/prompts";
import type { EmotionAnalysisResult } from "@/types/agents";

const EmotionSchema = z.object({
  stressIndicators: z.array(z.string()),
  overconfidenceRisk: z.boolean(),
  impulsivityRisk: z.boolean(),
  recommendedTone: z.enum(["calm", "warm", "grounded", "urgent"]),
  adjustedStressScore: z.number().min(0).max(1),
});

export async function runEmotionAgent(
  transcript: string,
  primaryEmotion: { primary: string; intensity: number; markers: string[] }
): Promise<EmotionAnalysisResult> {
  const { object } = await generateObject({
    model: geminiFlash(),
    schema: EmotionSchema,
    system: EMOTION_AGENT_PROMPT,
    prompt: JSON.stringify({ transcript, primaryEmotion }),
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
