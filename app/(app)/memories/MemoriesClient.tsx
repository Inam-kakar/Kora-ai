"use client";

import { useState, type FormEvent } from "react";

import { type MemoryCardData } from "@/components/memory/MemoryCard";
import { MemoryTimeline } from "@/components/memory/MemoryTimeline";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

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
    <div className="space-y-4">
      <Card>
        <form className="flex flex-col gap-3 sm:flex-row" onSubmit={handleSearch}>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search memories semantically..."
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          />
          <Button type="submit" disabled={loading}>
            {loading ? "Searching..." : "Search"}
          </Button>
        </form>
      </Card>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      <MemoryTimeline memories={memories} />
    </div>
  );
}
