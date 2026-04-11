import { NextRequest, NextResponse } from "next/server";

import { runPatternAgent } from "@/agents/pattern-agent";
import { connectDB } from "@/lib/mongodb";
import { MemoryEntry } from "@/models/MemoryEntry";
import { Pattern } from "@/models/Pattern";
import { User } from "@/models/User";

export async function GET(req: NextRequest): Promise<Response> {
  const authorization = req.headers.get("Authorization");
  if (authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const users = await User.find({ "settings.proactiveAlerts": true }).lean();

  for (const user of users) {
    const userId = String(user._id);
    try {
      const entries = await MemoryEntry.find(
        {
          userId,
          createdAt: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
        },
        { embedding: 0 }
      )
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

      if (entries.length < 3) {
        continue;
      }

      const patternResult = await runPatternAgent(entries);

      for (const pattern of patternResult.patterns) {
        await Pattern.findOneAndUpdate(
          { userId, patternId: pattern.id },
          {
            userId,
            patternId: pattern.id,
            title: pattern.title,
            description: pattern.description,
            occurrences: pattern.occurrences,
            lastSeen: new Date(pattern.lastSeen),
            severity: pattern.severity,
            triggerConditions: pattern.triggerConditions,
            historicalOutcomes: pattern.historicalOutcomes,
            updatedAt: new Date(),
          },
          { upsert: true, returnDocument: "after" }
        );
      }
    } catch (error) {
      console.error({
        userId,
        operation: "daily-pattern-cron",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return NextResponse.json({ ok: true });
}
