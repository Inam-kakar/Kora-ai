import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { synthesizeSpeechStream } from "@/lib/elevenlabs";
import { rateLimit } from "@/lib/rate-limit";
import { normalizeUserSettings } from "@/lib/user-settings";
import { User } from "@/models/User";

const RequestSchema = z.object({
  text: z.string().min(1).max(5000),
  emotionalTone: z.enum(["calm", "warm", "grounded", "urgent"]).optional(),
});

export async function POST(req: NextRequest): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = await rateLimit(session.user.id, "synthesize");
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

  await connectDB();
  const user = await User.findById(session.user.id).lean();
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const settings = normalizeUserSettings(
    (user as { settings?: unknown }).settings
  );
  const selectedVoice = settings.selectedVoice;
  if (!selectedVoice?.voiceId) {
    return NextResponse.json(
      { error: "No ElevenLabs voice selected in settings" },
      { status: 400 }
    );
  }

  try {
    const stream = await synthesizeSpeechStream(parsed.data.text, {
      emotionalTone: parsed.data.emotionalTone,
      voiceId: selectedVoice.voiceId,
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Synthesis failed" },
      { status: 500 }
    );
  }
}
