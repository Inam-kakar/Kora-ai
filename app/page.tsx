import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <main className="w-full max-w-2xl space-y-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-8">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-indigo-300">KORA</p>
          <h1 className="text-3xl font-semibold text-slate-100">
            Voice-first financial memory agent
          </h1>
          <p className="text-sm text-slate-300">
            Capture daily voice check-ins, detect behavior patterns, and receive
            proactive support grounded in your own history.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/login"
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            Sign in
          </Link>
          <Link
            href="/dashboard"
            className="rounded-md border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
          >
            Open dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
