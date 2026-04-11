import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface ICheckinSession extends Document {
  userId: string;
  startedAt: Date;
  endedAt?: Date;
  entryId?: Types.ObjectId;
  durationSeconds?: number;
  status: "in-progress" | "completed" | "abandoned";
}

const CheckinSessionSchema = new Schema<ICheckinSession>(
  {
    userId: { type: String, required: true, index: true },
    startedAt: { type: Date, default: Date.now, index: true },
    endedAt: { type: Date },
    entryId: { type: Schema.Types.ObjectId, ref: "MemoryEntry" },
    durationSeconds: { type: Number },
    status: {
      type: String,
      enum: ["in-progress", "completed", "abandoned"],
      default: "in-progress",
      index: true,
    },
  },
  { versionKey: false }
);

export const CheckinSession =
  (mongoose.models.CheckinSession as mongoose.Model<ICheckinSession>) ||
  mongoose.model<ICheckinSession>("CheckinSession", CheckinSessionSchema);
