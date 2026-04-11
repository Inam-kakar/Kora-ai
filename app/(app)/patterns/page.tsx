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
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
      <div className="flex flex-col md:items-end justify-between items-start gap-4 mb-2">
        <div>
           <div className="flex items-center gap-2 mb-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
                 Pattern Agent Online
              </span>
           </div>
           <h1 className="text-3xl font-extrabold tracking-tight text-white mb-1">
             Behavioral Matrix
           </h1>
           <p className="text-sm text-zinc-400">Recurring patterns mapped across your journal history.</p>
        </div>
      </div>
      
      <div className="rounded-xl border border-zinc-800 bg-[#0A0A0A] p-6">
         <h2 className="text-sm font-bold text-white mb-4">Baseline Emotional Heatmap</h2>
         <EmotionHeatmap values={emotionValues} />
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 mt-4">
        {mappedPatterns.length === 0 ? (
          <div className="md:col-span-2 rounded-xl border border-zinc-800 bg-[#0A0A0A] p-10 flex items-center justify-center">
             <p className="text-sm text-zinc-500">No recurring patterns detected yet.</p>
          </div>
        ) : (
          mappedPatterns.map((pattern) => (
            <div key={`${pattern.id}-${pattern.lastSeen}`} className="rounded-xl border border-zinc-800 bg-[#0A0A0A] p-6 hover:border-zinc-700 transition-colors">
               <PatternCard pattern={pattern} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
