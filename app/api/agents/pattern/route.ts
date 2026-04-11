import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { runPatternAgent } from "@/agents/pattern-agent";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { rateLimit } from "@/lib/rate-limit";
import { MemoryEntry } from "@/models/MemoryEntry";

const RequestSchema = z.object({
  days: z.number().int().positive().max(365).default(90),
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

  let payload: unknown = {};
  try {
    payload = await req.json();
  } catch {
    payload = {};
  }

  const parsed = RequestSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  try {
    await connectDB();

    const entries = await MemoryEntry.find(
      {
        userId: session.user.id,
        createdAt: {
          $gte: new Date(Date.now() - parsed.data.days * 24 * 60 * 60 * 1000),
        },
      },
      { embedding: 0 }
    )
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const result = await runPatternAgent(entries);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Pattern analysis failed" },
      { status: 500 }
    );
  }
}
