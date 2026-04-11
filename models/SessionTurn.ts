import mongoose, { Schema, type Document } from "mongoose";

export type SessionTurnMode = "chat" | "voice";
export type SessionTurnRole = "user" | "assistant" | "system";

export interface ISessionTurn extends Document {
  userId: string;
  sessionId: string;
  mode: SessionTurnMode;
  role: SessionTurnRole;
  content: string;
  turnId?: string;
  turnIndex?: number;
  createdAt: Date;
  metadata: Record<string, unknown>;
}

const SessionTurnSchema = new Schema<ISessionTurn>(
  {
    userId: { type: String, required: true, index: true },
    sessionId: { type: String, required: true, index: true },
    mode: {
      type: String,
      enum: ["chat", "voice"],
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["user", "assistant", "system"],
      required: true,
    },
    content: { type: String, required: true },
    turnId: { type: String, index: true },
    turnIndex: { type: Number },
    createdAt: { type: Date, default: Date.now, index: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { versionKey: false }
);

SessionTurnSchema.index({ userId: 1, sessionId: 1, createdAt: -1 });
SessionTurnSchema.index(
  { userId: 1, sessionId: 1, turnId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      turnId: { $exists: true, $type: "string" },
    },
  }
);

export const SessionTurn =
  (mongoose.models.SessionTurn as mongoose.Model<ISessionTurn>) ||
  mongoose.model<ISessionTurn>("SessionTurn", SessionTurnSchema);
