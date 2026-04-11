export type EmotionPrimary =
  | "stress"
  | "excitement"
  | "regret"
  | "confidence"
  | "anxiety"
  | "relief"
  | "guilt"
  | "hope";

export type DecisionType = string;

export interface MemoryEmotion {
  primary: EmotionPrimary;
  intensity: number;
  markers: string[];
}

export interface DecisionPoint {
  type: DecisionType;
  amount?: number;
  currency?: string;
  counterparty?: string;
  deadline?: Date;
  resolved?: boolean;
  outcome?: string;
  summary: string;
}

export interface MemorySummary {
  id: string;
  createdAt: Date;
  summary: string;
  stressScore: number;
  themes: string[];
  emotions: MemoryEmotion;
}
