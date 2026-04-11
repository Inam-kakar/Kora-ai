import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { findSimilarMemories } from "@/lib/vector-search";

const RequestSchema = z.object({
  query: z.string().min(1),
  limit: z.number().int().positive().max(50).optional(),
  minScore: z.number().min(0).max(1).optional(),
});

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

  const parsed = RequestSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  try {
    const results = await findSimilarMemories(session.user.id, parsed.data.query, {
      limit: parsed.data.limit ?? 10,
      minScore: parsed.data.minScore ?? 0.75,
    });

    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Search failed" },
      { status: 500 }
    );
  }
}
