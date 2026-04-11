import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { MemoryEntry } from "@/models/MemoryEntry";
import { Pattern } from "@/models/Pattern";
import { TriggerAlert } from "@/models/TriggerAlert";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  await connectDB();

  const [recentMemories, activeAlerts, patternCount] = await Promise.all([
    MemoryEntry.find({ userId: session.user.id }, { embedding: 0 })
      .sort({ createdAt: -1 })
      .limit(7)
      .lean(),
    TriggerAlert.find({ userId: session.user.id, status: "pending" })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
    Pattern.countDocuments({ userId: session.user.id }),
  ]);

  const stressTrend = recentMemories
    .map((memory) => memory.stressScore)
    .reverse()
    .map((score) => Math.round(score * 100));

  const streak = new Set(
    recentMemories.map((memory) =>
      new Date(memory.createdAt).toISOString().slice(0, 10)
    )
  ).size;

  return (
    <div className="space-y-6">
      <Card className="space-y-3">
        <h1 className="text-2xl font-semibold text-slate-100">
          Welcome back, {session.user.name ?? "there"}.
        </h1>
        <p className="text-sm text-slate-300">
          Check-in streak: <strong>{streak}</strong> days in the last week.
        </p>
        <p className="text-sm text-slate-300">
          Patterns tracked: <strong>{patternCount}</strong>
        </p>
        <Link
          href="/checkin"
          className="inline-flex rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          Start check-in
        </Link>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-100">Stress trend (7 days)</h2>
          <div className="flex items-end gap-2">
            {stressTrend.length === 0 ? (
              <p className="text-xs text-slate-400">No check-ins yet.</p>
            ) : (
              stressTrend.map((value, index) => (
                <div key={`${index}-${value}`} className="flex flex-col items-center gap-1">
                  <div
                    className="w-7 rounded-sm bg-indigo-500/80"
                    style={{ height: `${Math.max(6, value)}px` }}
                  />
                  <span className="text-[10px] text-slate-400">{value}</span>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-100">Active alerts</h2>
          {activeAlerts.length === 0 ? (
            <p className="text-sm text-slate-400">No pending alerts.</p>
          ) : (
            <div className="space-y-3">
              {activeAlerts.map((alert) => (
                <div key={String(alert._id)} className="space-y-1 rounded-md border border-slate-800 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge tone={alert.urgency === "critical" ? "critical" : alert.urgency}>
                      {alert.urgency}
                    </Badge>
                    <span className="text-xs text-slate-400">
                      {new Date(alert.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-slate-200">{alert.alertMessage}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
