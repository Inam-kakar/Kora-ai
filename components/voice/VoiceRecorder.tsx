"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";

interface VoiceRecorderProps {
  onRecorded?: (blob: Blob) => Promise<void> | void;
}

export function VoiceRecorder({ onRecorded }: VoiceRecorderProps) {
  const { recording, error, startRecording, stopRecording } = useVoiceRecorder();
  const [submitting, setSubmitting] = useState(false);

  const toggleRecording = async () => {
    if (!recording) {
      await startRecording();
      return;
    }

    setSubmitting(true);
    const blob = await stopRecording();
    if (blob && onRecorded) {
      await onRecorded(blob);
    }
    setSubmitting(false);
  };

  return (
    <div className="space-y-2">
      <Button onClick={toggleRecording} disabled={submitting}>
        {!recording ? "Start Recording" : "Stop Recording"}
      </Button>
      {error ? <p className="text-xs text-rose-300">{error}</p> : null}
    </div>
  );
}
