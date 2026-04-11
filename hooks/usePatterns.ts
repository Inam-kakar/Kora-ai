"use client";

import { useCallback, useState } from "react";

import type { PatternRecord } from "@/types/agents";

export function usePatterns() {
  const [patterns, setPatterns] = useState<PatternRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPatterns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/agents/pattern", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data: { patterns?: PatternRecord[]; error?: string } =
        await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load patterns");
      }

      setPatterns(data.patterns ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  return { patterns, loading, error, loadPatterns };
}
