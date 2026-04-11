"use client";

import { useState } from "react";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface DocumentSection {
  title: string;
  content: string;
  type: "narrative" | "stats" | "list";
}

interface ReviewPayload {
  title: string;
  generatedAt: string;
  sections: DocumentSection[];
  error?: string;
}

export default function ReviewPage() {
  const [loading, setLoading] = useState(false);
  const [review, setReview] = useState<ReviewPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateReview = async () => {
    setLoading(true);
    setError(null);

    const response = await fetch("/api/agents/document", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year: new Date().getUTCFullYear() }),
    });

    const payload: ReviewPayload = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(payload.error ?? "Could not generate review");
      return;
    }

    setReview(payload);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-100">Financial Life Review</h1>
      <Card className="space-y-3">
        <p className="text-sm text-slate-300">
          Generate your annual narrative based on memory entries, patterns, and alerts.
        </p>
        <Button onClick={generateReview} disabled={loading}>
          {loading ? "Generating..." : "Generate review"}
        </Button>
      </Card>

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      {review ? (
        <Card className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-100">{review.title}</h2>
          <p className="text-xs text-slate-400">
            Generated at: {new Date(review.generatedAt).toLocaleString()}
          </p>
          <div className="space-y-4">
            {review.sections.map((section) => (
              <section key={`${section.title}-${section.type}`} className="space-y-1">
                <h3 className="text-sm font-semibold text-slate-200">{section.title}</h3>
                <p className="text-sm text-slate-300 whitespace-pre-wrap">{section.content}</p>
              </section>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
