import mongoose, { Schema, type Document } from "mongoose";

export const MEMORY_JOB_TYPES = [
  "turn_ingest",
  "rolling_summary_update",
] as const;

export type MemoryJobType = (typeof MEMORY_JOB_TYPES)[number];

export const MEMORY_JOB_STATUSES = [
  "pending",
  "processing",
  "completed",
  "failed",
] as const;

export type MemoryJobStatus = (typeof MEMORY_JOB_STATUSES)[number];

export type TurnIngestPayload = {
  turnId: string;
  turnIndex?: number;
  transcript?: string;
  memoryEntryId?: string;
};

export type RollingSummaryUpdatePayload = {
  memoryEntryIds?: string[];
  windowStart?: Date;
  windowEnd?: Date;
  summaryEntryId?: string;
};

type MemoryJobPayloadDocument = {
  turnId?: string;
  turnIndex?: number;
  transcript?: string;
  memoryEntryId?: string;
  memoryEntryIds?: string[];
  windowStart?: Date;
  windowEnd?: Date;
  summaryEntryId?: string;
};

export type MemoryJobPayload =
  | TurnIngestPayload
  | RollingSummaryUpdatePayload;

export interface IMemoryJobError {
  message: string;
  code?: string;
  occurredAt: Date;
}

export interface IMemoryJob extends Document {
  userId: string;
  sessionId: string;
  jobType: MemoryJobType;
  status: MemoryJobStatus;
  payload: MemoryJobPayload;
  idempotencyKey?: string;
  attempts: number;
  maxAttempts: number;
  runAfter: Date;
  lockedAt?: Date;
  lockedBy?: string;
  error?: IMemoryJobError;
  createdAt: Date;
  updatedAt: Date;
}

const MemoryJobErrorSchema = new Schema<IMemoryJobError>(
  {
    message: { type: String, required: true },
    code: { type: String },
    occurredAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const MemoryJobPayloadSchema = new Schema<MemoryJobPayloadDocument>(
  {
    turnId: { type: String },
    turnIndex: { type: Number, min: 0 },
    transcript: { type: String },
    memoryEntryId: { type: String },
    memoryEntryIds: [{ type: String }],
    windowStart: { type: Date },
    windowEnd: { type: Date },
    summaryEntryId: { type: String },
  },
  { _id: false, strict: true }
);

const MemoryJobSchema = new Schema<IMemoryJob>(
  {
    userId: { type: String, required: true, index: true },
    sessionId: { type: String, required: true, index: true },
    jobType: {
      type: String,
      enum: MEMORY_JOB_TYPES,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: MEMORY_JOB_STATUSES,
      required: true,
      default: "pending",
      index: true,
    },
    payload: { type: MemoryJobPayloadSchema, required: true },
    idempotencyKey: { type: String },
    attempts: { type: Number, required: true, default: 0, min: 0 },
    maxAttempts: { type: Number, required: true, default: 5, min: 1 },
    runAfter: { type: Date, required: true, default: Date.now, index: true },
    lockedAt: { type: Date },
    lockedBy: { type: String },
    error: { type: MemoryJobErrorSchema },
  },
  { versionKey: false, timestamps: true }
);

MemoryJobSchema.index({ status: 1, runAfter: 1, createdAt: 1 });
MemoryJobSchema.index({ userId: 1, status: 1, runAfter: 1, createdAt: 1 });
MemoryJobSchema.index({ userId: 1, sessionId: 1, createdAt: -1 });
MemoryJobSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });

export const MemoryJob =
  (mongoose.models.MemoryJob as mongoose.Model<IMemoryJob>) ||
  mongoose.model<IMemoryJob>("MemoryJob", MemoryJobSchema);
