import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { transcribeAudio } from "@/lib/elevenlabs";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = await rateLimit(session.user.id, "transcribe");
  if (!limit.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const formData = await req.formData();
  const file = formData.get("audio");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing audio file" }, { status: 400 });
  }

  try {
    const transcription = await transcribeAudio(file);
    return NextResponse.json(transcription);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Transcription failed",
      },
      { status: 500 }
    );
  }
}
