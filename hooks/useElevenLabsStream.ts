"use client";

import { useCallback, useRef, useState } from "react";

import type { EmotionalTone } from "@/types/voice";

export function useElevenLabsStream() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const [playing, setPlaying] = useState(false);

  const speak = useCallback(async (text: string, emotionalTone?: EmotionalTone) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    const context = audioContextRef.current;

    const response = await fetch("/api/voice/synthesize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, emotionalTone }),
    });

    if (!response.ok) {
      throw new Error("Failed to synthesize voice");
    }

    const buffer = await response.arrayBuffer();
    const audioBuffer = await context.decodeAudioData(buffer);

    sourceNodeRef.current?.stop();
    const source = context.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(context.destination);
    source.onended = () => setPlaying(false);
    source.start();

    sourceNodeRef.current = source;
    setPlaying(true);
  }, []);

  const stop = useCallback(() => {
    sourceNodeRef.current?.stop();
    setPlaying(false);
  }, []);

  return { speak, stop, playing };
}
