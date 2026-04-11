import type { DecisionPoint, MemoryEmotion } from "@/types/memory";
import type { EmotionalTone } from "@/types/voice";

export type PatternSeverity = "low" | "medium" | "high";
export type TriggerUrgency = "low" | "medium" | "high" | "critical";

export interface MemoryExtractionResult {
  themes: string[];
  emotions: MemoryEmotion;
  decisionPoints: DecisionPoint[];
  stressScore: number;
  summary: string;
}

export interface PatternRecord {
  id: string;
  title: string;
  description: string;
  occurrences: number;
  lastSeen: string;
  severity: PatternSeverity;
  triggerConditions: string[];
  historicalOutcomes: string[];
}

export interface PatternAnalysisResult {
  patterns: PatternRecord[];
}

export interface TriggerResult {
  shouldAlert: boolean;
  urgency?: TriggerUrgency;
  matchedPattern?: {
    id: string;
    title: string;
    similarity: number;
  };
  alertMessage?: string;
  memoriesToReplay?: string[];
}

export interface ResearchResult {
  relevantData: Array<{
    title: string;
    value: string;
    source: string;
    relevance: string;
  }>;
  marketContext: string;
  benchmarks: Array<{
    label: string;
    value: string;
    comparison: string;
  }>;
}

export interface DocumentSection {
  title: string;
  content: string;
  type: "narrative" | "stats" | "list";
}

export interface DocumentResult {
  title: string;
  generatedAt: string;
  sections: DocumentSection[];
}

export interface EmotionAnalysisResult {
  stressIndicators: string[];
  overconfidenceRisk: boolean;
  impulsivityRisk: boolean;
  recommendedTone: EmotionalTone;
  adjustedStressScore: number;
}
