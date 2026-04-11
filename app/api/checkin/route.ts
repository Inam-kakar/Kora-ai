import { streamText } from "ai";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import {
  formatFinanceContext,
  getFinanceSnapshot,
} from "@/lib/finance-live-data";
import { geminiFlash } from "@/lib/gemini";
import { connectDB } from "@/lib/mongodb";
import { KORA_CHECKIN_SYSTEM_PROMPT } from "@/lib/prompts";
import { findSimilarMemories } from "@/lib/vector-search";
import { CheckinRequestSchema } from "@/schemas/checkin";

export async function POST(req: NextRequest): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parseResult = CheckinRequestSchema.safeParse(payload);
  if (!parseResult.success) {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  try {
    await connectDB();

    const { messages, transcript } = parseResult.data;

    // Fetch memories and finance data in parallel to reduce pre-LLM latency
    const [memoriesResult, financeResult] = await Promise.allSettled([
      transcript
        ? findSimilarMemories(session.user.id, transcript, {
            limit: 6,
            minScore: 0.65,
          })
        : Promise.resolve([]),
      transcript ? getFinanceSnapshot(transcript) : Promise.resolve(null),
    ]);

    const relevantMemories =
      memoriesResult.status === "fulfilled" ? memoriesResult.value : [];

    if (memoriesResult.status === "rejected") {
      console.error({
        userId: session.user.id,
        operation: "findSimilarMemories",
        error:
          memoriesResult.reason instanceof Error
            ? memoriesResult.reason.message
            : String(memoriesResult.reason),
      });
    }

    const financeSnapshot =
      financeResult.status === "fulfilled" ? financeResult.value : null;

    if (financeResult.status === "rejected") {
      console.error({
        userId: session.user.id,
        operation: "finance-live-data",
        error:
          financeResult.reason instanceof Error
            ? financeResult.reason.message
            : String(financeResult.reason),
      });
    }

    const memoryContext = relevantMemories.length
      ? `\n\n## Relevant memories from the user's past:\n${relevantMemories
          .map(
            (memory, index) =>
              `[${index + 1}] ${new Date(memory.createdAt).toISOString().slice(0, 10)}: ${memory.summary}`
          )
          .join("\n")}`
      : "";

    const financeContext = formatFinanceContext(financeSnapshot);

    const result = streamText({
      model: geminiFlash(),
      system: KORA_CHECKIN_SYSTEM_PROMPT + memoryContext + financeContext,
      messages:
        messages as NonNullable<Parameters<typeof streamText>[0]["messages"]>,
      maxOutputTokens: 600,
      temperature: 0.7,
      // Prevent Vertex from sending an empty toolConfig that causes INVALID_ARGUMENT
      toolChoice: "none",
      providerOptions: {
        vertex: {
          streamFunctionCallArguments: false,
        },
      },
    });

    return result.toTextStreamResponse();
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to process check-in request",
      },
      { status: 500 }
    );
  }
}
