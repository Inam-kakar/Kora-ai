import { Card } from "@/components/ui/Card";

interface EmotionHeatmapProps {
  values: Array<{ emotion: string; intensity: number }>;
}

export function EmotionHeatmap({ values }: EmotionHeatmapProps) {
  if (values.length === 0) {
    return (
      <Card>
        <p className="text-sm text-slate-400">No emotion trend data yet.</p>
      </Card>
    );
  }

  return (
    <Card className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-100">Emotion trend</h3>
      <div className="space-y-2">
        {values.map((item) => (
          <div key={item.emotion} className="space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>{item.emotion}</span>
              <span>{Math.round(item.intensity * 100)}%</span>
            </div>
            <div className="h-2 rounded bg-slate-800">
              <div
                className="h-full rounded bg-indigo-500"
                style={{ width: `${Math.round(item.intensity * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
