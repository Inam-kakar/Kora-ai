import mongoose, { Schema, type Document } from "mongoose";

export type MemoryMode = "voice" | "chat";
export type MemorySource = "checkin_pipeline" | "realtime_turn" | "rolling_summary";
export type MemoryRole = "user" | "assistant" | "system";

export interface IMemoryEntry extends Document {
  userId: string;
  sessionId: string;
  createdAt: Date;
  mode: MemoryMode;
  source: MemorySource;
  role?: MemoryRole;
  turnId?: string;
  turnIndex?: number;
  transcript: string;
  responseText?: string;
  embedding: number[];
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
}

const MemoryEntrySchema = new Schema<IMemoryEntry>(
  {
    userId: { type: String, required: true, index: true },
    sessionId: { type: String, required: true },
    createdAt: { type: Date, default: Date.now, index: true },
    mode: {
      type: String,
      enum: ["voice", "chat"],
      default: "voice",
      required: true,
      index: true,
    },
    source: {
      type: String,
      enum: ["checkin_pipeline", "realtime_turn", "rolling_summary"],
      default: "checkin_pipeline",
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["user", "assistant", "system"],
    },
    turnId: { type: String, index: true },
    turnIndex: { type: Number },
    transcript: { type: String, required: true },
    responseText: { type: String },
    embedding: { type: [Number], required: true },
    themes: [{ type: String }],
    emotions: {
      primary: { type: String, required: true },
      intensity: { type: Number, min: 0, max: 1, required: true },
      markers: [{ type: String }],
    },
    decisionPoints: [
      {
        type: { type: String, required: true },
        amount: { type: Number },
        currency: { type: String },
        counterparty: { type: String },
        deadline: { type: Date },
        resolved: { type: Boolean },
        outcome: { type: String },
        summary: { type: String, required: true },
      },
    ],
    stressScore: { type: Number, min: 0, max: 1, required: true },
    summary: { type: String, maxlength: 200, required: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { versionKey: false }
);

MemoryEntrySchema.index({ embedding: "2dsphere" });
MemoryEntrySchema.index({ userId: 1, createdAt: -1 });
MemoryEntrySchema.index({ userId: 1, mode: 1, source: 1, createdAt: -1 });
MemoryEntrySchema.index({ userId: 1, sessionId: 1, source: 1, createdAt: -1 });

export const MemoryEntry =
  (mongoose.models.MemoryEntry as mongoose.Model<IMemoryEntry>) ||
  mongoose.model<IMemoryEntry>("MemoryEntry", MemoryEntrySchema);
