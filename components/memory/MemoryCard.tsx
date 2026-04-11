import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

export interface MemoryCardData {
  id: string;
  createdAt: Date;
  summary: string;
  stressScore: number;
  emotion: {
    primary: string;
    intensity: number;
  };
}

export function MemoryCard({ memory }: { memory: MemoryCardData }) {
  const stressPercent = Math.min(100, Math.max(0, Math.round(memory.stressScore * 100)));
  const stressTone =
    stressPercent >= 75 ? "critical" : stressPercent >= 55 ? "high" : "low";

  return (
    <Card className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-slate-200">{memory.summary}</p>
        <Badge tone={stressTone}>{stressPercent}% stress</Badge>
      </div>

      <div className="space-y-1 text-xs text-slate-400">
        <p>{new Date(memory.createdAt).toLocaleString()}</p>
        <p>
          Emotion: {memory.emotion.primary} ({Math.round(memory.emotion.intensity * 100)}%)
        </p>
      </div>
    </Card>
  );
}
