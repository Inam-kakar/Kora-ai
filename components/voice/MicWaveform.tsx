"use client";

import { useConversationControls, useConversationStatus } from "@elevenlabs/react";
import { useEffect, useRef } from "react";

export function MicWaveform() {
  const { getInputByteFrequencyData } = useConversationControls();
  const { status } = useConversationStatus();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (status !== "connected") {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    const draw = () => {
      const data = getInputByteFrequencyData();
      context.clearRect(0, 0, canvas.width, canvas.height);

      const barCount = Math.max(1, data.length);
      const barWidth = canvas.width / barCount;

      for (let index = 0; index < barCount; index += 1) {
        const value = data[index] ?? 0;
        const barHeight = (value / 255) * canvas.height;
        context.fillStyle = "#818cf8";
        context.fillRect(
          index * barWidth,
          canvas.height - barHeight,
          Math.max(1, barWidth - 1),
          barHeight
        );
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [getInputByteFrequencyData, status]);

  return (
    <canvas
      ref={canvasRef}
      width={260}
      height={56}
      className="w-full max-w-xs rounded-md border border-slate-700 bg-slate-950/80"
    />
  );
}
