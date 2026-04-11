"use client";

import {
  useConversationControls,
  useConversationMode,
  useConversationStatus,
} from "@elevenlabs/react";
import { useCallback, useState } from "react";

import { cn } from "@/lib/classnames";
import { KoraAvatar } from "@/components/voice/KoraAvatar";
import { Spinner } from "@/components/ui/Spinner";

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown voice connection error";
  }
}

interface KoraVoiceInterfaceProps {
  onSessionEnded?: () => Promise<void> | void;
}

interface SignedUrlPayload {
  signedUrl?: string;
  error?: string;
}

export function KoraVoiceInterface({ onSessionEnded }: KoraVoiceInterfaceProps) {
  const { startSession, endSession, setVolume } = useConversationControls();
  const { status, message } = useConversationStatus();
  const { mode, isSpeaking, isListening } = useConversationMode();
  const [muted, setMuted] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    if (status !== "disconnected") {
      return;
    }

    setConnectError(null);

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setConnectError("Microphone permission is required to talk with KORA.");
      return;
    }

    try {
      const response = await fetch("/api/elevenlabs/token?transport=websocket", {
        method: "POST",
      });
      const payload: SignedUrlPayload = await response.json();
      if (!response.ok || !payload.signedUrl) {
        throw new Error(
          payload.error ?? "Unable to start websocket voice session"
        );
      }

      await startSession({
        signedUrl: payload.signedUrl,
        connectionType: "websocket",
      });
    } catch (error) {
      setConnectError(errorMessage(error));
    }
  }, [startSession, status]);

  const disconnect = useCallback(() => {
    if (status === "disconnected") {
      return;
    }
    endSession();
    if (onSessionEnded) {
      void onSessionEnded();
    }
  }, [endSession, onSessionEnded, status]);

  const toggleMute = useCallback(() => {
    const nextMuted = !muted;
    setMuted(nextMuted);
    setVolume({ volume: nextMuted ? 0 : 1 });
  }, [muted, setVolume]);

  const isConnected = status === "connected";
  const isConnecting = status === "connecting";

  return (
    <div className="flex flex-col items-center gap-4">
      <KoraAvatar speaking={isSpeaking} listening={isListening} />

      <p className="text-sm text-slate-300">
        {status === "disconnected" && "Disconnected"}
        {status === "connecting" && "Connecting..."}
        {status === "connected" && `Connected (${mode})`}
        {status === "error" && (message ?? "Voice connection error")}
      </p>
      {connectError ? <p className="text-xs text-rose-300">{connectError}</p> : null}

      <button
        type="button"
        onClick={isConnected ? disconnect : connect}
        disabled={isConnecting}
        className={cn(
          "inline-flex h-12 min-w-36 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium text-white transition-colors disabled:cursor-wait disabled:opacity-60",
          !isConnected && "bg-indigo-600 hover:bg-indigo-500",
          isConnected && "bg-rose-600 hover:bg-rose-500"
        )}
      >
        {isConnecting ? (
          <>
            <Spinner />
            Connecting
          </>
        ) : isConnected ? (
          "End Session"
        ) : (
          "Talk to KORA"
        )}
      </button>

      {isConnected && (
        <button
          type="button"
          onClick={toggleMute}
          className="text-xs text-slate-300 underline hover:text-slate-100"
        >
          {muted ? "Unmute output" : "Mute output"}
        </button>
      )}
    </div>
  );
}
