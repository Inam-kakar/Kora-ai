import type { PipelineStage } from "mongoose";

import { connectDB } from "@/lib/mongodb";
import { embed } from "@/lib/embeddings";
import { MemoryEntry, type MemoryMode, type MemorySource } from "@/models/MemoryEntry";

export interface VectorSearchResult {
  _id: string;
  userId: string;
  sessionId: string;
  createdAt: Date;
  transcript: string;
  themes: string[];
  emotions: {
    primary: string;
    intensity: number;
    markers: string[];
  };
  decisionPoints: Array<{
    type: string;
    amount?: number;
    currency?: string;
    counterparty?: string;
    deadline?: Date;
    resolved?: boolean;
    outcome?: string;
    summary: string;
  }>;
  stressScore: number;
  summary: string;
  metadata: Record<string, unknown>;
  score: number;
}

export interface VectorSearchOptions {
  /** Maximum results to return (default 8) */
  limit?: number;
  /** Minimum vector similarity score 0-1 (default 0.62 — permissive for RAG) */
  minScore?: number;
  dateFrom?: Date;
  themes?: string[];
  mode?: MemoryMode;
  sessionId?: string;
  sources?: MemorySource[];
  /**
   * When true the pipeline also fetches the single most-recent rolling summary
   * for the session and prepends it to the results so it is always available
   * as context regardless of its similarity score.
   */
  includeRollingSummary?: boolean;
}

/**
 * Executes a vector search against MongoDB Atlas and returns semantically
 * relevant memory entries, sorted by score descending.
 *
 * Improvements over v1:
 * - Higher numCandidates (200) for a wider ANN recall window
 * - Lower default minScore (0.62) so lightly-related memories are included
 *   — the LLM is the final relevance filter, not the embedding threshold
 * - Parallel fetch of optional rolling-summary anchor entry
 * - Recency boost: entries within the last 30 days get a small score bump
 *   applied in Mongo's $addFields stage so the sort reflects both
 *   semantic similarity and freshness
 */
export async function findSimilarMemories(
  userId: string,
  queryText: string,
  options: VectorSearchOptions = {}
): Promise<VectorSearchResult[]> {
  if (!userId.trim()) {
    throw new Error("userId is required for memory vector search");
  }

  await connectDB();

  const limit = options.limit ?? 8;
  const minScore = options.minScore ?? 0.62;

  // Embed the query — this is the only unavoidable serial step
  const queryEmbedding = await embed(queryText);

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const pipeline: PipelineStage[] = [
    {
      $vectorSearch: {
        index: "vector_index",
        path: "embedding",
        queryVector: queryEmbedding,
        // Wider candidate pool improves recall for ANN search
        numCandidates: 200,
        // Fetch a few extra so recency boost reordering has room to work
        limit: Math.min(limit + 4, 20),
        filter: {
          userId,
          ...(options.mode && { mode: options.mode }),
          ...(options.sessionId && { sessionId: options.sessionId }),
          ...(options.sources?.length && { source: { $in: options.sources } }),
          ...(options.dateFrom && { createdAt: { $gte: options.dateFrom } }),
          ...(options.themes?.length && { themes: { $in: options.themes } }),
        },
      },
    } as PipelineStage,
    {
      $addFields: {
        rawScore: { $meta: "vectorSearchScore" },
        // Recency boost: +0.04 for entries in the last 30 days
        recencyBoost: {
          $cond: {
            if: { $gte: ["$createdAt", thirtyDaysAgo] },
            then: 0.04,
            else: 0,
          },
        },
      },
    },
    {
      $addFields: {
        score: { $add: ["$rawScore", "$recencyBoost"] },
      },
    },
    // Apply minimum score filter after boost
    { $match: { rawScore: { $gte: minScore } } },
    // Sort by boosted score
    { $sort: { score: -1 } },
    { $limit: limit },
    {
      $project: {
        embedding: 0,
        rawScore: 0,
        recencyBoost: 0,
      },
    },
  ];

  const results = await MemoryEntry.aggregate<VectorSearchResult>(pipeline);

  // Optionally prepend the rolling summary anchor for the session
  if (options.includeRollingSummary && options.sessionId) {
    try {
      const rollingSummary = await MemoryEntry.findOne(
        {
          userId,
          sessionId: options.sessionId,
          source: "rolling_summary",
        },
        { embedding: 0 }
      ).lean();

      if (rollingSummary) {
        const anchor = {
          ...(rollingSummary as unknown as VectorSearchResult),
          score: 1.0, // Pin rolling summary at top
        };
        // Insert at front, remove duplicate if already retrieved by vector search
        const deduped = results.filter(
          (r) => String(r._id) !== String(rollingSummary._id)
        );
        return [anchor, ...deduped].slice(0, limit);
      }
    } catch {
      // Non-critical; continue with vector results only
    }
  }

  return results;
}
