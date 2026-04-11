import { generateObject } from "ai";
import { z } from "zod";

import { runMemoryAgent } from "@/agents/memory-agent";
import type { FinanceSnapshot } from "@/lib/finance-live-data";
import { geminiFlash } from "@/lib/gemini";
import { embed } from "@/lib/embeddings";
import { connectDB } from "@/lib/mongodb";
import { REALTIME_MEMORY_SUMMARY_PROMPT } from "@/lib/prompts";
import { sanitizeTranscript } from "@/lib/sanitize-transcript";
import { MemoryEntry, type IMemoryEntry, type MemoryMode } from "@/models/MemoryEntry";
import type { MemoryExtractionResult } from "@/types/agents";

const RollingSummarySchema = z.object({
  summary: z.string(),
  keyDecisions: z.array(z.string()),
  riskSignals: z.array(z.string()),
});

type RollingSummaryResult = z.infer<typeof RollingSummarySchema>;

interface TurnSummaryInput {
  createdAt: Date;
  transcript: string;
  responseText?: string;
  summary: string;
  stressScore: number;
}

const FALLBACK_STRESS_KEYWORDS = [
  "stress",
  "stressed",
  "anxious",
  "worried",
  "panic",
  "overwhelmed",
  "debt",
  "late payment",
] as const;

const FALLBACK_THEME_RULES = [
  {
    theme: "impulse_purchase",
    keywords: ["impulse", "bought", "buy", "shopping", "spending"],
  },
  {
    theme: "loan_pressure",
    keywords: ["loan", "borrow", "debt", "credit"],
  },
  {
    theme: "budgeting",
    keywords: ["budget", "save", "savings", "cap", "cut back"],
  },
  {
    theme: "investment_decision",
    keywords: ["invest", "stocks", "fund", "portfolio"],
  },
] as const;

export interface PersistRealtimeTurnInput {
  userId: string;
  sessionId: string;
  mode: MemoryMode;
  userMessage: string;
  assistantMessage?: string;
  turnId?: string;
  turnIndex?: number;
  financeSnapshot?: FinanceSnapshot | null;
}

export interface PersistRealtimeTurnResult {
  turnEntryId: string;
  /** Present when persistence is synchronous; undefined when deferred to background */
  rollingSummaryEntryId?: string;
  /** Present when persistence is synchronous; undefined when deferred to background */
  rollingSummary?: string;
}

function normalizeText(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

function truncateText(input: string, maxLength: number): string {
  const normalized = normalizeText(input);
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return normalized.slice(0, maxLength).trimEnd();
}

function uniqueLimited(values: string[], limit: number): string[] {
  const uniqueValues: string[] = [];
  for (const value of values) {
    const normalized = normalizeText(value);
    if (!normalized || uniqueValues.includes(normalized)) {
      continue;
    }

    uniqueValues.push(normalized);
    if (uniqueValues.length >= limit) {
      break;
    }
  }

  return uniqueValues;
}

function normalizeTurnSummaryInput(entry: IMemoryEntry): TurnSummaryInput {
  return {
    createdAt: new Date(entry.createdAt),
    transcript: entry.transcript,
    responseText: entry.responseText,
    summary: entry.summary,
    stressScore: entry.stressScore,
  };
}

function logMemoryError(userId: string, operation: string, error: unknown): void {
  console.error({
    userId,
    operation,
    error: error instanceof Error ? error.message : String(error),
  });
}

function buildFallbackExtraction(transcript: string): MemoryExtractionResult {
  const normalizedTranscript = normalizeText(transcript);
  const transcriptForAnalysis = normalizedTranscript.toLowerCase();

  const stressMarkers = FALLBACK_STRESS_KEYWORDS.filter((keyword) =>
    transcriptForAnalysis.includes(keyword)
  ).slice(0, 5);
  const matchedThemes = FALLBACK_THEME_RULES.filter(({ keywords }) =>
    keywords.some((keyword) => transcriptForAnalysis.includes(keyword))
  )
    .map(({ theme }) => theme)
    .slice(0, 5);

  const stressScore = stressMarkers.length
    ? Math.min(0.9, 0.35 + stressMarkers.length * 0.12)
    : 0.2;
  const primaryEmotion: MemoryExtractionResult["emotions"]["primary"] =
    stressMarkers.length >= 2 ? "stress" : stressMarkers.length === 1 ? "anxiety" : "confidence";

  return {
    themes: matchedThemes,
    emotions: {
      primary: primaryEmotion,
      intensity: stressScore,
      markers: stressMarkers,
    },
    decisionPoints: [],
    stressScore,
    summary: truncateText(
      normalizedTranscript || "User shared a financial update.",
      200
    ),
  };
}

function buildFallbackRollingSummary(turns: TurnSummaryInput[]): RollingSummaryResult {
  const relevantTurns = turns.slice(-4);
  const summaryCandidates = relevantTurns
    .map((turn) => turn.summary || turn.transcript)
    .map((value) => truncateText(value, 280))
    .filter(Boolean);

  const decisionCandidates = relevantTurns
    .map((turn) => turn.summary || turn.transcript)
    .filter((value) => /(buy|purchase|loan|borrow|debt|budget|save|invest|spend)/i.test(value))
    .map((value) => truncateText(value, 120));

  const riskCandidates = relevantTurns
    .filter((turn) => turn.stressScore >= 0.6)
    .map((turn) => truncateText(turn.summary || turn.transcript, 120));

  const summary = truncateText(
    summaryCandidates.join(" ") || "Conversation summary unavailable.",
    1200
  );
  const keyDecisions =
    uniqueLimited(decisionCandidates, 8).length > 0
      ? uniqueLimited(decisionCandidates, 8)
      : [truncateText(relevantTurns.at(-1)?.summary || "Review recent financial decisions.", 120)];
  const riskSignals =
    uniqueLimited(riskCandidates, 8).length > 0
      ? uniqueLimited(riskCandidates, 8)
      : [truncateText("Monitor stress-driven decisions in upcoming turns.", 120)];

  return {
    summary: summary || "Conversation summary unavailable.",
    keyDecisions,
    riskSignals,
  };
}

async function runMemoryExtractionWithFallback(
  userId: string,
  operation: string,
  transcript: string
): Promise<MemoryExtractionResult> {
  try {
    return await runMemoryAgent(transcript);
  } catch (error) {
    logMemoryError(userId, operation, error);
    return buildFallbackExtraction(transcript);
  }
}

async function generateRollingSummaryWithFallback(
  input: PersistRealtimeTurnInput,
  summarySeed: TurnSummaryInput[]
): Promise<RollingSummaryResult> {
  try {
    const { object } = await generateObject({
      model: geminiFlash(),
      schema: RollingSummarySchema,
      system: REALTIME_MEMORY_SUMMARY_PROMPT,
      prompt: JSON.stringify({
        mode: input.mode,
        turns: summarySeed,
        financeSnapshot: input.financeSnapshot ?? null,
      }),
      providerOptions: {
        vertex: {
          streamFunctionCallArguments: false,
        },
      },
      maxOutputTokens: 800,
      temperature: 0.3,
    });

    return object;
  } catch (error) {
    logMemoryError(input.userId, "rollingSummaryGenerationFallback", error);
    return buildFallbackRollingSummary(summarySeed);
  }
}

/**
 * Background job: update rolling summary after a turn is persisted.
 * This is intentionally fire-and-forget — errors are logged but never
 * bubble up to the caller.
 */
async function updateRollingSummaryInBackground(
  input: PersistRealtimeTurnInput,
  turnId: string
): Promise<void> {
  try {
    await connectDB();

    const recentTurns = await MemoryEntry.find(
      {
        userId: input.userId,
        sessionId: input.sessionId,
        mode: input.mode,
        source: "realtime_turn",
      },
      { embedding: 0 }
    )
      .sort({ createdAt: -1 })
      .limit(12);

    const summarySeed = recentTurns
      .slice()
      .reverse()
      .map((entry) => normalizeTurnSummaryInput(entry));

    const rollingSummaryObject = await generateRollingSummaryWithFallback(input, summarySeed);
    const rollingSummaryText = sanitizeTranscript(rollingSummaryObject.summary);

    // Run embedding and extraction in parallel for speed
    const [rollingSummaryEmbedding, rollingSummaryExtraction] = await Promise.all([
      embed(rollingSummaryText),
      runMemoryExtractionWithFallback(
        input.userId,
        "rollingSummaryMemoryExtractionFallback",
        rollingSummaryText
      ),
    ]);

    await MemoryEntry.findOneAndUpdate(
      {
        userId: input.userId,
        sessionId: input.sessionId,
        mode: input.mode,
        source: "rolling_summary",
      },
      {
        userId: input.userId,
        sessionId: input.sessionId,
        mode: input.mode,
        source: "rolling_summary",
        role: "system",
        transcript: rollingSummaryText,
        embedding: rollingSummaryEmbedding,
        themes: rollingSummaryExtraction.themes,
        emotions: rollingSummaryExtraction.emotions,
        decisionPoints: rollingSummaryExtraction.decisionPoints.map((decision) => ({
          ...decision,
          deadline: decision.deadline ? new Date(decision.deadline) : undefined,
        })),
        stressScore: rollingSummaryExtraction.stressScore,
        summary: rollingSummaryExtraction.summary,
        metadata: {
          keyDecisions: rollingSummaryObject.keyDecisions,
          riskSignals: rollingSummaryObject.riskSignals,
          latestTurnId: turnId,
          mode: input.mode,
          ...(input.financeSnapshot ? { financeSnapshot: input.financeSnapshot } : {}),
        },
        createdAt: new Date(),
      },
      {
        returnDocument: "after",
        upsert: true,
      }
    );
  } catch (error) {
    logMemoryError(input.userId, "backgroundRollingSummaryUpdate", error);
  }
}

/**
 * Persists a realtime turn memory entry immediately (fast path).
 *
 * The expensive rolling-summary pipeline (LLM inference × 2 + embeddings × 2)
 * is kicked off as a fire-and-forget background job so the caller gets a
 * response as fast as possible.
 *
 * The result no longer contains `rollingSummary` / `rollingSummaryEntryId`
 * (those are now `undefined`) because the background job may not have
 * finished yet.  Callers that previously depended on these fields should
 * use the separate `/api/checkin/memory/summary` polling endpoint or
 * simply display a "memory saving…" indicator until the next turn.
 */
export async function persistRealtimeTurnMemory(
  input: PersistRealtimeTurnInput
): Promise<PersistRealtimeTurnResult> {
  if (!input.userId.trim()) {
    throw new Error("userId is required for realtime memory persistence");
  }
  if (!input.sessionId.trim()) {
    throw new Error("sessionId is required for realtime memory persistence");
  }

  await connectDB();

  const sanitizedUserMessage = sanitizeTranscript(input.userMessage);
  const sanitizedAssistantMessage = input.assistantMessage
    ? sanitizeTranscript(input.assistantMessage)
    : undefined;

  // Run memory extraction and embedding in parallel — both are independent
  const [extraction, embedding] = await Promise.all([
    runMemoryExtractionWithFallback(
      input.userId,
      "turnMemoryExtractionFallback",
      sanitizedUserMessage
    ),
    embed(sanitizedUserMessage),
  ]);

  const turnId = input.turnId ?? crypto.randomUUID();

  const turnEntry = (await MemoryEntry.create({
    userId: input.userId,
    sessionId: input.sessionId,
    mode: input.mode,
    source: "realtime_turn",
    role: "user",
    turnId,
    turnIndex: input.turnIndex,
    transcript: sanitizedUserMessage,
    responseText: sanitizedAssistantMessage,
    embedding,
    themes: extraction.themes,
    emotions: extraction.emotions,
    decisionPoints: extraction.decisionPoints.map((decision) => ({
      ...decision,
      deadline: decision.deadline ? new Date(decision.deadline) : undefined,
    })),
    stressScore: extraction.stressScore,
    summary: extraction.summary,
    metadata: {
      ...(input.financeSnapshot ? { financeSnapshot: input.financeSnapshot } : {}),
    },
  })) as IMemoryEntry;

  // Fire-and-forget: update the rolling summary without blocking the response
  void updateRollingSummaryInBackground(input, turnId).catch((error) => {
    logMemoryError(input.userId, "backgroundRollingSummary", error);
  });

  return {
    turnEntryId: String(turnEntry._id),
  };
}
