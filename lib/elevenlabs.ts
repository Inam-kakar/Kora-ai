import type { ElevenLabsVoiceOption, EmotionalTone } from "@/types/voice";
import { z } from "zod";

const ELEVENLABS_API_BASE = "https://api.elevenlabs.io/v1";

const TranscriptionWordSchema = z.object({
  start: z.number().optional(),
  end: z.number().optional(),
});

const TranscriptionChunkSchema = z.object({
  text: z.string(),
  words: z.array(TranscriptionWordSchema).optional(),
});

const SpeechToTextResponseSchema = z.union([
  TranscriptionChunkSchema,
  z.object({
    transcripts: z.array(TranscriptionChunkSchema),
  }),
]);

const ElevenLabsVoiceSchema = z
  .object({
    voice_id: z.string(),
    name: z.string(),
    category: z.string().optional(),
    description: z.string().nullable().optional(),
    preview_url: z.string().nullable().optional(),
    labels: z.record(z.string(), z.string()).optional(),
  })
  .passthrough();

const ElevenLabsVoicesResponseSchema = z.object({
  voices: z.array(ElevenLabsVoiceSchema),
});

const TONE_PRESETS: Record<
  EmotionalTone,
  { stability: number; similarity_boost: number; style: number }
> = {
  calm: { stability: 0.75, similarity_boost: 0.75, style: 0.1 },
  warm: { stability: 0.55, similarity_boost: 0.8, style: 0.3 },
  grounded: { stability: 0.85, similarity_boost: 0.7, style: 0.05 },
  urgent: { stability: 0.4, similarity_boost: 0.85, style: 0.5 },
};

export interface SynthesisOptions {
  stability?: number;
  similarity_boost?: number;
  style?: number;
  emotionalTone?: EmotionalTone;
  voiceId?: string;
}

export interface TranscriptionResult {
  transcript: string;
  duration: number;
}

export function mapStressToTone(stressScore: number): EmotionalTone {
  if (stressScore >= 0.8) return "grounded";
  if (stressScore >= 0.6) return "calm";
  if (stressScore >= 0.4) return "warm";
  return "urgent";
}

function getTranscriptionDuration(
  chunks: Array<z.infer<typeof TranscriptionChunkSchema>>
): number {
  const ends = chunks.flatMap((chunk) =>
    (chunk.words ?? []).flatMap((word) =>
      typeof word.end === "number" ? [word.end] : []
    )
  );

  return ends.length > 0 ? Math.max(...ends) : 0;
}

export async function transcribeAudio(file: File): Promise<TranscriptionResult> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const modelId = process.env.ELEVENLABS_STT_MODEL_ID ?? "scribe_v2";
  if (!apiKey) {
    throw new Error("ElevenLabs configuration is missing");
  }

  const formData = new FormData();
  formData.set("model_id", modelId);
  formData.set("timestamps_granularity", "word");
  formData.set("file", file, file.name || "recording.webm");

  const response = await fetch(`${ELEVENLABS_API_BASE}/speech-to-text`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
    },
    body: formData,
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `ElevenLabs transcription failed (${response.status})${details ? `: ${details.slice(0, 200)}` : ""}`
    );
  }

  const payload: unknown = await response.json();
  const parsed = SpeechToTextResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error("Unexpected ElevenLabs transcription response shape");
  }

  const chunks =
    "transcripts" in parsed.data ? parsed.data.transcripts : [parsed.data];
  const transcript = chunks
    .map((chunk) => chunk.text.trim())
    .filter((chunk) => chunk.length > 0)
    .join(" ")
    .trim();

  if (!transcript) {
    throw new Error("Transcription is empty");
  }

  return {
    transcript,
    duration: getTranscriptionDuration(chunks),
  };
}

export async function listElevenLabsVoices(): Promise<ElevenLabsVoiceOption[]> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error("ElevenLabs configuration is missing");
  }

  const response = await fetch(`${ELEVENLABS_API_BASE}/voices`, {
    method: "GET",
    headers: {
      "xi-api-key": apiKey,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `Unable to load ElevenLabs voices (${response.status})${details ? `: ${details.slice(0, 200)}` : ""}`
    );
  }

  const payload: unknown = await response.json();
  const parsed = ElevenLabsVoicesResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error("Unexpected ElevenLabs voices response shape");
  }

  return parsed.data.voices.map((voice) => ({
    voiceId: voice.voice_id,
    name: voice.name,
    category: voice.category,
    description: voice.description ?? undefined,
    previewUrl: voice.preview_url ?? null,
    labels: voice.labels ?? {},
    raw: voice,
  }));
}

export async function synthesizeSpeechStream(
  text: string,
  options: SynthesisOptions = {}
): Promise<ReadableStream<Uint8Array>> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = options.voiceId;

  if (!apiKey) {
    throw new Error("ElevenLabs configuration is missing");
  }

  if (!voiceId) {
    throw new Error("No ElevenLabs voice selected");
  }

  const preset = options.emotionalTone ? TONE_PRESETS[options.emotionalTone] : undefined;
  const settings = { ...preset, ...options };

  const response = await fetch(
    `${ELEVENLABS_API_BASE}/text-to-speech/${voiceId}/stream`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_turbo_v2",
        voice_settings: {
          stability: settings.stability ?? 0.5,
          similarity_boost: settings.similarity_boost ?? 0.75,
          style: settings.style ?? 0.2,
          use_speaker_boost: true,
        },
        output_format: "mp3_44100_128",
      }),
    }
  );

  if (!response.ok || !response.body) {
    throw new Error(`ElevenLabs error: ${response.status}`);
  }

  return response.body;
}
