import type { ElevenLabsVoiceOption } from "@/types/voice";

type UserSubscriptionTier = "free" | "pro" | "family";

export interface NormalizedUserSettings {
  proactiveAlerts: boolean;
  timezone: string;
  subscriptionTier: UserSubscriptionTier;
  selectedVoice: ElevenLabsVoiceOption | null;
}

export const DEFAULT_USER_SETTINGS: NormalizedUserSettings = {
  proactiveAlerts: true,
  timezone: "UTC",
  subscriptionTier: "free",
  selectedVoice: null,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isSubscriptionTier(value: unknown): value is UserSubscriptionTier {
  return value === "free" || value === "pro" || value === "family";
}

function isStringRecord(value: unknown): value is Record<string, string> {
  if (!isRecord(value)) return false;
  return Object.values(value).every((entry) => typeof entry === "string");
}

function isVoiceOption(value: unknown): value is ElevenLabsVoiceOption {
  if (!isRecord(value)) return false;
  return (
    typeof value.voiceId === "string" &&
    value.voiceId.length > 0 &&
    typeof value.name === "string" &&
    value.name.length > 0 &&
    (value.category === undefined || typeof value.category === "string") &&
    (value.description === undefined || typeof value.description === "string") &&
    (value.previewUrl === undefined ||
      value.previewUrl === null ||
      typeof value.previewUrl === "string") &&
    isStringRecord(value.labels) &&
    isRecord(value.raw)
  );
}

export function normalizeUserSettings(
  input: unknown
): NormalizedUserSettings {
  if (!isRecord(input)) {
    return { ...DEFAULT_USER_SETTINGS };
  }

  return {
    proactiveAlerts:
      typeof input.proactiveAlerts === "boolean"
        ? input.proactiveAlerts
        : DEFAULT_USER_SETTINGS.proactiveAlerts,
    timezone:
      typeof input.timezone === "string" && input.timezone.trim().length > 0
        ? input.timezone
        : DEFAULT_USER_SETTINGS.timezone,
    subscriptionTier: isSubscriptionTier(input.subscriptionTier)
      ? input.subscriptionTier
      : DEFAULT_USER_SETTINGS.subscriptionTier,
    selectedVoice: isVoiceOption(input.selectedVoice)
      ? input.selectedVoice
      : DEFAULT_USER_SETTINGS.selectedVoice,
  };
}
