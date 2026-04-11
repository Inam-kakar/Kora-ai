import { embed as generateEmbedding } from "ai";

import { geminiEmbedding } from "@/lib/gemini";

export async function embed(text: string): Promise<number[]> {
  const result = await generateEmbedding({
    model: geminiEmbedding(),
    value: text.slice(0, 8000),
  });

  if (!result.embedding?.length) {
    throw new Error("Embedding generation failed");
  }

  return result.embedding;
}
