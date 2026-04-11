import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { listElevenLabsVoices, transcribeAudio } from "@/lib/elevenlabs";

describe("transcribeAudio", () => {
  const originalApiKey = process.env.ELEVENLABS_API_KEY;
  const originalModelId = process.env.ELEVENLABS_STT_MODEL_ID;

  beforeEach(() => {
    process.env.ELEVENLABS_API_KEY = "test-api-key";
    process.env.ELEVENLABS_STT_MODEL_ID = "scribe_v2";
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env.ELEVENLABS_API_KEY = originalApiKey;
    process.env.ELEVENLABS_STT_MODEL_ID = originalModelId;
    vi.restoreAllMocks();
  });

  it("returns transcript and duration from a single-channel response", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          text: "Hello world",
          words: [
            { start: 0, end: 0.45 },
            { start: 0.45, end: 1.2 },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    );

    const file = new File(["audio"], "checkin.webm", { type: "audio/webm" });
    const result = await transcribeAudio(file);

    expect(result).toEqual({
      transcript: "Hello world",
      duration: 1.2,
    });
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.elevenlabs.io/v1/speech-to-text",
      expect.objectContaining({
        method: "POST",
        headers: { "xi-api-key": "test-api-key" },
      })
    );

    const requestInit = fetchSpy.mock.calls[0]?.[1];
    const body = requestInit?.body;
    expect(body).toBeInstanceOf(FormData);

    const formData = body as FormData;
    expect(formData.get("model_id")).toBe("scribe_v2");
    expect(formData.get("timestamps_granularity")).toBe("word");
  });

  it("merges multichannel transcripts into a single transcript", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          transcripts: [
            {
              text: "First channel",
              words: [{ start: 0, end: 0.7 }],
            },
            {
              text: "Second channel",
              words: [{ start: 0.1, end: 1.8 }],
            },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    );

    const result = await transcribeAudio(
      new File(["audio"], "stereo.webm", { type: "audio/webm" })
    );

    expect(result).toEqual({
      transcript: "First channel Second channel",
      duration: 1.8,
    });
  });

  it("throws an error when ElevenLabs returns a non-200 response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("invalid request", { status: 400 })
    );

    await expect(
      transcribeAudio(new File(["audio"], "bad.webm", { type: "audio/webm" }))
    ).rejects.toThrow("ElevenLabs transcription failed (400)");
  });

  it("returns available ElevenLabs voices normalized for UI usage", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          voices: [
            {
              voice_id: "voice_1",
              name: "Kora Warm",
              category: "premade",
              description: "Warm support tone",
              preview_url: "https://example.com/preview.mp3",
              labels: { accent: "en-US" },
              extra_field: "kept in raw",
            },
          ],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    );

    const voices = await listElevenLabsVoices();

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.elevenlabs.io/v1/voices",
      expect.objectContaining({
        method: "GET",
        headers: { "xi-api-key": "test-api-key" },
      })
    );
    expect(voices).toHaveLength(1);
    expect(voices[0]).toMatchObject({
      voiceId: "voice_1",
      name: "Kora Warm",
      category: "premade",
      description: "Warm support tone",
      previewUrl: "https://example.com/preview.mp3",
      labels: { accent: "en-US" },
    });
    expect(voices[0]?.raw).toEqual(
      expect.objectContaining({
        voice_id: "voice_1",
        extra_field: "kept in raw",
      })
    );
  });
});
