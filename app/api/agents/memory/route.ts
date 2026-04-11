import { NextRequest, NextResponse } from "next/server";

import { runCheckinPipeline } from "@/lib/agent-runner";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { AgentPipelineResponseSchema } from "@/schemas/agent-output";
import { MemoryIngestSchema } from "@/schemas/memory-entry";

export async function POST(req: NextRequest): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = await rateLimit(session.user.id, "agents");
  if (!limit.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = MemoryIngestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  try {
    const result = await runCheckinPipeline(
      session.user.id,
      parsed.data.sessionId,
      parsed.data.transcript
    );

    const responsePayload = AgentPipelineResponseSchema.parse({
      entryId: String(result.entry._id),
      patternsFound: result.patterns.length,
      alertTriggered: result.trigger.shouldAlert,
    });

    return NextResponse.json(responsePayload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Memory pipeline failed" },
      { status: 500 }
    );
  }
}
