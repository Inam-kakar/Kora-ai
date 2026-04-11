"use client";

import { useState, type FormEvent } from "react";
import { Search, Loader2 } from "lucide-react";

import { type MemoryCardData } from "@/components/memory/MemoryCard";
import { MemoryTimeline } from "@/components/memory/MemoryTimeline";

interface MemoriesClientProps {
  initialMemories: MemoryCardData[];
}

interface SearchResponse {
  results?: Array<{
    _id: string;
    createdAt: string;
    summary: string;
    stressScore: number;
    emotions: {
      primary: string;
      intensity: number;
    };
  }>;
  error?: string;
}

export function MemoriesClient({ initialMemories }: MemoriesClientProps) {
  const [query, setQuery] = useState("");
  const [memories, setMemories] = useState<MemoryCardData[]>(initialMemories);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!query.trim()) {
      setMemories(initialMemories);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const response = await fetch("/api/memories/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, limit: 20 }),
    });

    const payload: SearchResponse = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(payload.error ?? "Search failed");
      return;
    }

    const mappedMemories: MemoryCardData[] = (payload.results ?? []).map((memory) => ({
      id: memory._id,
      createdAt: new Date(memory.createdAt),
      summary: memory.summary,
      stressScore: memory.stressScore,
      emotion: {
        primary: memory.emotions.primary,
        intensity: memory.emotions.intensity,
      },
    }));

    setMemories(mappedMemories);
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
      <div className="flex flex-col md:items-end justify-between items-start gap-4 mb-2">
        <div>
           <div className="flex items-center gap-2 mb-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
                 Vector DB Connected
              </span>
           </div>
           <h1 className="text-3xl font-extrabold tracking-tight text-white mb-1">
             Memories Hub
           </h1>
           <p className="text-sm text-zinc-400">Search 1536-dimensional embeddings natively.</p>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-[#0A0A0A] overflow-hidden p-6">
        <form className="relative flex items-center" onSubmit={handleSearch}>
           <Search className="absolute left-4 h-5 w-5 text-zinc-500" />
           <input
             value={query}
             onChange={(event) => setQuery(event.target.value)}
             placeholder="Search past memories semantically..."
             className="w-full rounded-md border border-zinc-800 bg-black pl-12 pr-24 py-3 text-sm text-slate-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors shadow-inner"
           />
           <button 
             type="submit" 
             disabled={loading}
             className="absolute right-2 flex h-8 items-center justify-center rounded bg-white px-4 text-xs font-bold text-black disabled:opacity-50 transition-colors hover:bg-zinc-200"
           >
             {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search Vector"}
           </button>
        </form>
        {error ? <p className="text-xs text-red-400 mt-3 pl-2">{error}</p> : null}
      </div>

      <div className="mt-8">
        <MemoryTimeline memories={memories} />
      </div>
    </div>
  );
}
