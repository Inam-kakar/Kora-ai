import { redirect } from "next/navigation";

import { EmotionHeatmap } from "@/components/patterns/EmotionHeatmap";
import { PatternCard } from "@/components/patterns/PatternCard";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { MemoryEntry } from "@/models/MemoryEntry";
import { Pattern } from "@/models/Pattern";
import type { PatternRecord } from "@/types/agents";

export const dynamic = "force-dynamic";

export default async function PatternsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  await connectDB();

  const [patterns, recentEntries] = await Promise.all([
    Pattern.find({ userId: session.user.id }).sort({ severity: -1, lastSeen: -1 }).lean(),
    MemoryEntry.find({ userId: session.user.id }, { embedding: 0 })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean(),
  ]);

  const mappedPatterns: PatternRecord[] = patterns.map((pattern) => ({
    id: pattern.patternId,
    title: pattern.title,
    description: pattern.description,
    occurrences: pattern.occurrences,
    lastSeen: new Date(pattern.lastSeen).toISOString(),
    severity: pattern.severity,
    triggerConditions: pattern.triggerConditions,
    historicalOutcomes: pattern.historicalOutcomes,
  }));

  const emotionSums = new Map<string, { total: number; count: number }>();
  for (const entry of recentEntries) {
    const current = emotionSums.get(entry.emotions.primary) ?? { total: 0, count: 0 };
    emotionSums.set(entry.emotions.primary, {
      total: current.total + entry.emotions.intensity,
      count: current.count + 1,
    });
  }

  const emotionValues = Array.from(emotionSums.entries()).map(([emotion, value]) => ({
    emotion,
    intensity: value.count === 0 ? 0 : value.total / value.count,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-100">Behavioral patterns</h1>
      <EmotionHeatmap values={emotionValues} />
      <div className="grid gap-4 md:grid-cols-2">
        {mappedPatterns.length === 0 ? (
          <p className="text-sm text-slate-400">No patterns detected yet.</p>
        ) : (
          mappedPatterns.map((pattern) => (
            <PatternCard key={`${pattern.id}-${pattern.lastSeen}`} pattern={pattern} />
          ))
        )}
      </div>
    </div>
  );
}
