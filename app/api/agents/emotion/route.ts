import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { runEmotionAgent } from "@/agents/emotion-agent";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

const RequestSchema = z.object({
  transcript: z.string().min(1),
  primaryEmotion: z.object({
    primary: z.string().min(1),
    intensity: z.number().min(0).max(1),
    markers: z.array(z.string()),
  }),
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
    const result = await runEmotionAgent(
      parsed.data.transcript,
      parsed.data.primaryEmotion
    );
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Emotion analysis failed" },
      { status: 500 }
    );
  }
}
