import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { runYearlyDocumentPipeline } from "@/lib/agent-runner";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

const RequestSchema = z.object({
  year: z.number().int().min(2000).max(2100).optional(),
  category: z.string().optional(),
  documentType: z.string().optional(),
  useMemory: z.boolean().optional(),
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
    const year = parsed.data.year ?? new Date().getUTCFullYear();
    const result = await runYearlyDocumentPipeline(session.user.id, year, {
      category: parsed.data.category,
      documentType: parsed.data.documentType,
      useMemory: parsed.data.useMemory,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Document generation failed" },
      { status: 500 }
    );
  }
}
