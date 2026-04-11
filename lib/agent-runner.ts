import { runDocumentAgent } from "@/agents/document-agent";
import { runEmotionAgent } from "@/agents/emotion-agent";
import { runMemoryAgent } from "@/agents/memory-agent";
import { runPatternAgent } from "@/agents/pattern-agent";
import { runResearchAgent } from "@/agents/research-agent";
import { runTriggerAgent } from "@/agents/trigger-agent";
import { embed } from "@/lib/embeddings";
import { connectDB } from "@/lib/mongodb";
import { sanitizeTranscript } from "@/lib/sanitize-transcript";
import { findSimilarMemories, type VectorSearchResult } from "@/lib/vector-search";
import { MemoryEntry, type IMemoryEntry } from "@/models/MemoryEntry";
import { Pattern } from "@/models/Pattern";
import { TriggerAlert } from "@/models/TriggerAlert";
import type {
  DocumentResult,
  EmotionAnalysisResult,
  PatternAnalysisResult,
  ResearchResult,
  TriggerResult,
} from "@/types/agents";

function logAgentError(userId: string, operation: string, error: unknown): void {
  console.error({
    userId,
    operation,
    error: error instanceof Error ? error.message : String(error),
  });
}

export interface CheckinPipelineResult {
  entry: IMemoryEntry;
  patterns: PatternAnalysisResult["patterns"];
  trigger: TriggerResult;
  emotion: EmotionAnalysisResult | null;
}

export async function runCheckinPipeline(
  userId: string,
  sessionId: string,
  transcript: string
): Promise<CheckinPipelineResult> {
  await connectDB();

  const sanitizedTranscript = sanitizeTranscript(transcript);
  const extraction = await runMemoryAgent(sanitizedTranscript);
  const embedding = await embed(sanitizedTranscript);

  const entry = (await MemoryEntry.create({
    userId,
    sessionId,
    mode: "voice",
    source: "checkin_pipeline",
    role: "user",
    transcript: sanitizedTranscript,
    embedding,
    themes: extraction.themes,
    emotions: extraction.emotions,
    decisionPoints: extraction.decisionPoints.map((decision) => ({
      ...decision,
      deadline: decision.deadline ? new Date(decision.deadline) : undefined,
    })),
    stressScore: extraction.stressScore,
    summary: extraction.summary,
    metadata: {},
  })) as IMemoryEntry;

  let similarMemories: VectorSearchResult[] = [];
  try {
    similarMemories = await findSimilarMemories(userId, sanitizedTranscript, {
      limit: 20,
      minScore: 0.75,
    });
  } catch (error) {
    logAgentError(userId, "findSimilarMemories", error);
  }

  let emotionResult: EmotionAnalysisResult | null = null;
  try {
    emotionResult = await runEmotionAgent(sanitizedTranscript, extraction.emotions);
  } catch (error) {
    logAgentError(userId, "runEmotionAgent", error);
  }

  let patternResult: PatternAnalysisResult = { patterns: [] };
  try {
    const recentEntries = await MemoryEntry.find(
      {
        userId,
        createdAt: { $gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
      },
      { embedding: 0 }
    )
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    patternResult = await runPatternAgent(recentEntries);

    for (const pattern of patternResult.patterns) {
      await Pattern.findOneAndUpdate(
        { userId, patternId: pattern.id },
        {
          userId,
          patternId: pattern.id,
          title: pattern.title,
          description: pattern.description,
          occurrences: pattern.occurrences,
          lastSeen: new Date(pattern.lastSeen),
          severity: pattern.severity,
          triggerConditions: pattern.triggerConditions,
          historicalOutcomes: pattern.historicalOutcomes,
          updatedAt: new Date(),
        },
        { upsert: true, returnDocument: "after" }
      );
    }
  } catch (error) {
    logAgentError(userId, "runPatternAgent", error);
  }

  let triggerResult: TriggerResult = { shouldAlert: false };
  try {
    triggerResult = await runTriggerAgent(
      extraction.summary,
      patternResult.patterns,
      similarMemories
    );
  } catch (error) {
    logAgentError(userId, "runTriggerAgent", error);
  }

  if (triggerResult.shouldAlert && triggerResult.urgency && triggerResult.urgency !== "low") {
    await TriggerAlert.create({
      userId,
      entryId: entry._id,
      patternId: triggerResult.matchedPattern?.id,
      alertMessage:
        triggerResult.alertMessage ?? "KORA noticed a pattern worth your attention.",
      urgency: triggerResult.urgency,
      memoriesToReplay: triggerResult.memoriesToReplay ?? [],
      status: "pending",
    });
  }

  return {
    entry,
    patterns: patternResult.patterns,
    trigger: triggerResult,
    emotion: emotionResult,
  };
}

export async function runYearlyDocumentPipeline(
  userId: string,
  year: number
): Promise<DocumentResult> {
  await connectDB();

  const yearStart = new Date(Date.UTC(year, 0, 1));
  const yearEnd = new Date(Date.UTC(year + 1, 0, 1));

  const [entries, patterns, alerts] = await Promise.all([
    MemoryEntry.find({ userId, createdAt: { $gte: yearStart, $lt: yearEnd } }, { embedding: 0 })
      .sort({ createdAt: 1 })
      .lean(),
    Pattern.find({ userId }).sort({ updatedAt: -1 }).lean(),
    TriggerAlert.find({ userId, createdAt: { $gte: yearStart, $lt: yearEnd } })
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  return runDocumentAgent(userId, year, { entries, patterns, alerts });
}

export async function runDecisionResearch(
  decisionSummary: string,
  decisionType: string
): Promise<ResearchResult> {
  return runResearchAgent(decisionSummary, decisionType);
}
