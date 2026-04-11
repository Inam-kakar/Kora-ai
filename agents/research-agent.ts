import { generateObject } from "ai";
import { z } from "zod";

import { formatFinanceContext, getFinanceSnapshot } from "@/lib/finance-live-data";
import { geminiFlash } from "@/lib/gemini";
import { RESEARCH_AGENT_PROMPT } from "@/lib/prompts";
import type { ResearchResult } from "@/types/agents";

const ResearchSchema = z.object({
  relevantData: z.array(
    z.object({
      title: z.string(),
      value: z.string(),
      source: z.string(),
      relevance: z.string(),
    })
  ),
  marketContext: z.string(),
  benchmarks: z.array(
    z.object({
      label: z.string(),
      value: z.string(),
      comparison: z.string(),
    })
  ),
});

export async function runResearchAgent(
  decisionSummary: string,
  decisionType: string
): Promise<ResearchResult> {
  let financeContext = "";
  try {
    const snapshot = await getFinanceSnapshot(`${decisionType} ${decisionSummary}`);
    financeContext = formatFinanceContext(snapshot);
  } catch (error) {
    console.error({
      operation: "research-live-finance",
      error: error instanceof Error ? error.message : String(error),
    });
    financeContext = `\n\nLive finance lookup failed: ${
      error instanceof Error ? error.message : String(error)
    }`;
  }

  const { object } = await generateObject({
    model: geminiFlash(),
    schema: ResearchSchema,
    system: RESEARCH_AGENT_PROMPT,
    prompt: JSON.stringify({ decisionSummary, decisionType, financeContext }),
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
