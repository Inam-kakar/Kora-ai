export type EmotionalTone = "calm" | "warm" | "grounded" | "urgent";

export interface VoiceSynthesisRequest {
  text: string;
  emotionalTone?: EmotionalTone;
}

export interface ElevenLabsVoiceOption {
  voiceId: string;
  name: string;
  category?: string;
  description?: string;
  previewUrl?: string | null;
  labels: Record<string, string>;
  raw: Record<string, unknown>;
}

export interface VoiceTranscriptionResponse {
  transcript: string;
  duration: number;
}
