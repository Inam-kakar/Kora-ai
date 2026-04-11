import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { runDecisionResearch } from "@/lib/agent-runner";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

const RequestSchema = z.object({
  decisionSummary: z.string().min(1),
  decisionType: z.string().min(1),
});

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

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  try {
    const result = await runDecisionResearch(
      parsed.data.decisionSummary,
      parsed.data.decisionType
    );
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Research failed" },
      { status: 500 }
    );
  }
}
