import mongoose, { Schema, type Document } from "mongoose";

export interface IPattern extends Document {
  userId: string;
  patternId: string;
  title: string;
  description: string;
  occurrences: number;
  lastSeen: Date;
  severity: "low" | "medium" | "high";
  triggerConditions: string[];
  historicalOutcomes: string[];
  updatedAt: Date;
}

const PatternSchema = new Schema<IPattern>(
  {
    userId: { type: String, required: true, index: true },
    patternId: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    occurrences: { type: Number, required: true, default: 1 },
    lastSeen: { type: Date, required: true },
    severity: {
      type: String,
      enum: ["low", "medium", "high"],
      required: true,
    },
    triggerConditions: [{ type: String }],
    historicalOutcomes: [{ type: String }],
    updatedAt: { type: Date, default: Date.now, index: true },
  },
  { versionKey: false }
);

PatternSchema.index({ userId: 1, patternId: 1 }, { unique: true });

export const Pattern =
  (mongoose.models.Pattern as mongoose.Model<IPattern>) ||
  mongoose.model<IPattern>("Pattern", PatternSchema);
