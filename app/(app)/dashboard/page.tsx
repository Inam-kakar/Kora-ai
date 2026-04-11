import Link from "next/link";
import { redirect } from "next/navigation";
import { 
  Activity, BellRing, BrainCircuit, Mic, Calendar, Flame, AlertCircle, ArrowRight, ShieldCheck
} from "lucide-react";

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

  const currentStress = stressTrend.length > 0 ? stressTrend[stressTrend.length - 1] : 0;
  const avgStress = stressTrend.length > 0 ? Math.round(stressTrend.reduce((a, b) => a + b, 0) / stressTrend.length) : 0;

  return (
    <div className="min-h-screen bg-black text-zinc-100 p-6 md:p-12 font-sans selection:bg-zinc-800 selection:text-white">
      {/* HEADER SECTION */}
      <div className="max-w-6xl mx-auto mb-10 flex flex-col md:flex-row md:items-end justify-between items-start gap-4">
        <div>
           <div className="flex items-center gap-2 mb-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Kora Engine Online</span>
           </div>
           <h1 className="text-3xl font-extrabold tracking-tight text-white mb-1">
             Welcome back, {session.user.name?.split(' ')[0] ?? "there"}.
           </h1>
           <p className="text-sm text-zinc-400">Here is your behavioral financial snapshot.</p>
        </div>
        
        <Link
          href="/checkin"
          className="group flex items-center justify-center gap-2 rounded-md bg-white px-5 py-2.5 text-sm font-semibold text-black transition-all hover:bg-zinc-200"
        >
          <Mic className="h-4 w-4" />
          Start Check-in
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>

      <div className="max-w-6xl mx-auto space-y-6">
        {/* TOP METRICS ROW */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-xl border border-zinc-800 bg-[#0A0A0A] p-6 hover:border-zinc-700 transition-colors">
            <div className="flex items-center justify-between mb-4">
               <h3 className="text-sm font-semibold text-zinc-400">Current Streak</h3>
               <Flame className="h-5 w-5 text-orange-500" />
            </div>
            <div className="flex items-baseline gap-2">
               <span className="text-4xl font-black text-white">{streak}</span>
               <span className="text-sm font-medium text-zinc-500">Days</span>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-[#0A0A0A] p-6 hover:border-zinc-700 transition-colors">
            <div className="flex items-center justify-between mb-4">
               <h3 className="text-sm font-semibold text-zinc-400">Patterns Tracked</h3>
               <BrainCircuit className="h-5 w-5 text-indigo-400" />
            </div>
            <div className="flex items-baseline gap-2">
               <span className="text-4xl font-black text-white">{patternCount}</span>
               <span className="text-sm font-medium text-zinc-500">Active</span>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-[#0A0A0A] p-6 hover:border-zinc-700 transition-colors">
            <div className="flex items-center justify-between mb-4">
               <h3 className="text-sm font-semibold text-zinc-400">Average Stress</h3>
               <Activity className={`h-5 w-5 ${avgStress > 70 ? 'text-red-400' : avgStress > 40 ? 'text-yellow-400' : 'text-emerald-400'}`} />
            </div>
            <div className="flex items-baseline gap-2">
               <span className="text-4xl font-black text-white">{avgStress}%</span>
               <span className="text-sm font-medium text-zinc-500">7-Day Avg</span>
            </div>
          </div>
        </div>

        {/* MAIN SPLIT */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ANALYTICS BLOCK */}
          <div className="rounded-xl border border-zinc-800 bg-[#0A0A0A] overflow-hidden flex flex-col">
            <div className="border-b border-zinc-800 bg-[#0F0F0F] px-6 py-4 flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                 <Activity className="h-4 w-4 text-zinc-400" /> 7-Day Stress Analytics
              </h2>
              <span className="text-xs font-mono text-zinc-500">Last updated: Today</span>
            </div>
            <div className="p-8 flex-grow flex flex-col justify-center min-h-[250px]">
              {stressTrend.length === 0 ? (
                <div className="text-center">
                   <Calendar className="h-8 w-8 text-zinc-700 mx-auto mb-3" />
                   <p className="text-sm text-zinc-500">No check-in data available yet.</p>
                </div>
              ) : (
                <div className="flex items-end justify-between h-40 gap-3 w-full">
                  {stressTrend.map((value, index) => (
                    <div key={`${index}-${value}`} className="group relative flex flex-col items-center justify-end w-full h-full">
                      <div 
                        className="w-full bg-zinc-800 rounded-sm hover:bg-zinc-600 transition-colors overflow-hidden border border-zinc-700/50"
                        style={{ height: `${Math.max(8, value)}%`, minHeight: '8%' }}
                      >
                         <div className={`w-full h-full ${value > 75 ? 'bg-red-500/20' : value > 40 ? 'bg-yellow-500/20' : 'bg-emerald-500/20'}`} />
                      </div>
                      <span className="mt-3 text-[10px] font-mono text-zinc-500 opacity-0 group-hover:opacity-100 absolute -top-8 bg-zinc-800 px-2 py-1 rounded text-white transition-opacity border border-zinc-700 z-10">
                         {value}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ALERTS BLOCK */}
          <div className="rounded-xl border border-zinc-800 bg-[#0A0A0A] overflow-hidden flex flex-col">
             <div className="border-b border-zinc-800 bg-[#0F0F0F] px-6 py-4 flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                 <BellRing className="h-4 w-4 text-zinc-400" /> Pending Trigger Alerts
              </h2>
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500/20 text-[10px] font-bold text-red-500">
                 {activeAlerts.length}
              </span>
            </div>
            
            <div className="p-6 flex-grow flex flex-col gap-3 min-h-[250px] max-h-[350px] overflow-y-auto">
              {activeAlerts.length === 0 ? (
                <div className="flex-grow flex flex-col items-center justify-center text-center">
                   <ShieldCheck className="h-8 w-8 text-emerald-500/50 mx-auto mb-3" />
                   <p className="text-sm font-medium text-emerald-500">All clear</p>
                   <p className="text-xs text-zinc-500 mt-1">No impending behavioral patterns detected.</p>
                </div>
              ) : (
                activeAlerts.map((alert) => (
                  <div key={String(alert._id)} className="group flex flex-col gap-2 rounded-lg border border-zinc-800 bg-black p-4 hover:border-zinc-700 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                         {alert.urgency === "critical" || alert.urgency === "high" ? (
                             <AlertCircle className="h-4 w-4 text-red-500" />
                         ) : (
                             <AlertCircle className="h-4 w-4 text-yellow-500" />
                         )}
                         <span className={`text-[10px] font-bold uppercase tracking-wider ${
                            alert.urgency === "critical" ? "text-red-500" : 
                            alert.urgency === "high" ? "text-orange-500" : 
                            "text-yellow-500"
                         }`}>
                           {alert.urgency} Priority
                         </span>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-600">
                        {new Date(alert.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-300 leading-relaxed italic border-l-2 border-zinc-800 pl-3 mt-1 group-hover:border-zinc-600 transition-colors">
                      "{alert.alertMessage}"
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
