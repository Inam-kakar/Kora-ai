import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import type { PatternRecord } from "@/types/agents";

const severityToTone = {
  low: "low",
  medium: "medium",
  high: "high",
} as const;

export function PatternCard({ pattern }: { pattern: PatternRecord }) {
  return (
    <Card className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-100">{pattern.title}</h3>
        <Badge tone={severityToTone[pattern.severity]}>{pattern.severity}</Badge>
      </div>
      <p className="text-sm text-slate-300">{pattern.description}</p>
      <div className="text-xs text-slate-400">
        <p>Occurrences: {pattern.occurrences}</p>
        <p>Last seen: {new Date(pattern.lastSeen).toLocaleDateString()}</p>
      </div>
      <div className="space-y-1">
        <p className="text-xs uppercase text-slate-500">Trigger conditions</p>
        <ul className="list-disc space-y-1 pl-5 text-xs text-slate-300">
          {pattern.triggerConditions.map((condition) => (
            <li key={condition}>{condition}</li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
