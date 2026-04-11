import mongoose, { Schema, type Document } from "mongoose";
import type { ElevenLabsVoiceOption } from "@/types/voice";

export type SubscriptionTier = "free" | "pro" | "family";

export interface IUser extends Document {
  email: string;
  name?: string;
  image?: string;
  provider?: string;
  settings: {
    proactiveAlerts: boolean;
    timezone: string;
    subscriptionTier: SubscriptionTier;
    selectedVoice: ElevenLabsVoiceOption | null;
  };
  createdAt: Date;
  lastActiveAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, index: true },
    name: { type: String },
    image: { type: String },
    provider: { type: String },
    settings: {
      proactiveAlerts: { type: Boolean, default: true },
      timezone: { type: String, default: "UTC" },
      subscriptionTier: {
        type: String,
        enum: ["free", "pro", "family"],
        default: "free",
      },
      selectedVoice: { type: Schema.Types.Mixed, default: null },
    },
    createdAt: { type: Date, default: Date.now },
    lastActiveAt: { type: Date, default: Date.now, index: true },
  },
  { versionKey: false }
);

export const User =
  (mongoose.models.User as mongoose.Model<IUser>) ||
  mongoose.model<IUser>("User", UserSchema);
