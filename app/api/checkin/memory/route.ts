import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { getFinanceSnapshot } from "@/lib/finance-live-data";
import { connectDB } from "@/lib/mongodb";
import { rateLimit } from "@/lib/rate-limit";
import { persistRealtimeTurnMemory } from "@/lib/realtime-memory";

const RequestSchema = z.object({
  sessionId: z.string().min(1),
  mode: z.enum(["voice", "chat"]),
  userMessage: z.string().min(1).max(20000),
  assistantMessage: z.string().min(1).max(20000).optional(),
  turnId: z.string().min(1).optional(),
  turnIndex: z.number().int().nonnegative().optional(),
});

export async function POST(req: NextRequest): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = await rateLimit(session.user.id, "checkin");
  if (!limit.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  // Kick off persistence in background — respond immediately with 202 so the
  // voice UI is not blocked waiting for embedding + LLM extraction.
  const userId = session.user.id;
  void (async () => {
    try {
      await connectDB();

      let financeSnapshot = null;
      try {
        financeSnapshot = await getFinanceSnapshot(parsed.data.userMessage);
      } catch (error) {
        console.error({
          userId,
          operation: "finance-live-data",
          error: error instanceof Error ? error.message : String(error),
        });
      }

      await persistRealtimeTurnMemory({
        userId,
        sessionId: parsed.data.sessionId,
        mode: parsed.data.mode,
        userMessage: parsed.data.userMessage,
        assistantMessage: parsed.data.assistantMessage,
        turnId: parsed.data.turnId,
        turnIndex: parsed.data.turnIndex,
        financeSnapshot,
      });
    } catch (error) {
      console.error({
        userId,
        operation: "persist-realtime-memory-background",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })();

  // Return immediately — the client doesn't need to wait for DB writes
  return NextResponse.json({ accepted: true }, { status: 202 });
}
