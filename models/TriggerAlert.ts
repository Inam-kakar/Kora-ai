import mongoose, { Schema, type Document, type Types } from "mongoose";

export interface ITriggerAlert extends Document {
  userId: string;
  entryId: Types.ObjectId;
  patternId?: string;
  alertMessage: string;
  urgency: "low" | "medium" | "high" | "critical";
  memoriesToReplay: string[];
  status: "pending" | "delivered" | "dismissed";
  createdAt: Date;
}

const TriggerAlertSchema = new Schema<ITriggerAlert>(
  {
    userId: { type: String, required: true, index: true },
    entryId: {
      type: Schema.Types.ObjectId,
      ref: "MemoryEntry",
      required: true,
      index: true,
    },
    patternId: { type: String },
    alertMessage: { type: String, required: true },
    urgency: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      required: true,
    },
    memoriesToReplay: [{ type: String }],
    status: {
      type: String,
      enum: ["pending", "delivered", "dismissed"],
      default: "pending",
      index: true,
    },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { versionKey: false }
);

export const TriggerAlert =
  (mongoose.models.TriggerAlert as mongoose.Model<ITriggerAlert>) ||
  mongoose.model<ITriggerAlert>("TriggerAlert", TriggerAlertSchema);
