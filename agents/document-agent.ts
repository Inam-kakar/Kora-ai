import { generateObject } from "ai";
import { z } from "zod";

import { geminiPro } from "@/lib/gemini";
import { DOCUMENT_AGENT_PROMPT } from "@/lib/prompts";
import type { DocumentResult } from "@/types/agents";

const DocumentSchema = z.object({
  sections: z.array(
    z.object({
      title: z.string(),
      content: z.string(),
      type: z.enum(["narrative", "stats", "list"]),
    })
  ),
  title: z.string(),
  generatedAt: z.string(),
});

export async function runDocumentAgent(
  userId: string,
  year: number,
  summaryData: object
): Promise<DocumentResult> {
  const { object } = await generateObject({
    model: geminiPro(),
    schema: DocumentSchema,
    system: DOCUMENT_AGENT_PROMPT,
    prompt: JSON.stringify({ userId, year, summaryData }),
    providerOptions: {
      vertex: {
        streamFunctionCallArguments: false,
      },
    },
    maxOutputTokens: 3000,
    temperature: 0.7,
  });

  return object;
}
