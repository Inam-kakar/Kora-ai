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

declare global {
  interface Window {
    __koraStreamHooked?: boolean;
    __activeKoraMicStream?: MediaStream;
  }
}

export function KoraVoiceInterface({ onSessionEnded }: KoraVoiceInterfaceProps) {
  const { startSession, endSession, setVolume } = useConversationControls();
  const { status, message } = useConversationStatus();
  const { mode, isSpeaking, isListening } = useConversationMode();
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  // Intercept the SDK's internal getUserMedia call to gain control of the mic tracks
  if (typeof window !== "undefined" && !window.__koraStreamHooked) {
    window.__koraStreamHooked = true;
    const ogGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      const stream = await ogGetUserMedia(constraints);
      window.__activeKoraMicStream = stream;
      
      // If user paused BEFORE connecting, ensure tracks start disabled
      // Use setTimeout to ensure state is picked up
      setTimeout(() => {
         const currentlyMuted = document.getElementById("kora-mic-state")?.getAttribute("data-muted") === "true";
         stream.getAudioTracks().forEach(track => {
            track.enabled = !currentlyMuted;
         });
      }, 50);
      
      return stream;
    };
  }

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
    const nextMuted = !isMicMuted;
    setIsMicMuted(nextMuted);
    
    // Physically kill the audio track. VAD receives pure silence and instantly fires turn end.
    if (window.__activeKoraMicStream) {
      window.__activeKoraMicStream.getAudioTracks().forEach(track => {
        track.enabled = !nextMuted;
      });
    }
  }, [isMicMuted]);

  const isConnected = status === "connected";
  const isConnecting = status === "connecting";
  const agentSpeaking = isConnected && mode === "speaking";
  const userListened = isConnected && mode === "listening";

  return (
    <div className="flex flex-col items-center gap-6 p-4">
      {/* Hidden DOM node to pass state reliably to the media setup hook without closure loops */}
      <span id="kora-mic-state" data-muted={isMicMuted} className="hidden" />

      <div className={`relative ${agentSpeaking ? 'ring-4 ring-indigo-500/50 rounded-full animate-pulse' : ''} ${userListened && !isMicMuted ? 'ring-4 ring-emerald-500/50 rounded-full' : ''}`}>
         <KoraAvatar speaking={agentSpeaking} listening={userListened && !isMicMuted} />
         {isMicMuted && <div className="absolute top-0 right-0 bg-red-500 rounded-full h-4 w-4 border-2 border-black" title="Mic Muted" />}
      </div>

      <div className="text-center">
         <p className="text-sm font-bold text-white mb-1">
           {status === "disconnected" && "System Standby"}
           {status === "connecting" && "Initializing Engine..."}
           {isConnected && agentSpeaking && "Kora is responding..."}
           {isConnected && userListened && !isMicMuted && "Listening..."}
           {isConnected && userListened && isMicMuted && "Microphone paused."}
           {status === "error" && "Connection error"}
         </p>
         {connectError ? <p className="text-xs text-rose-400">{connectError}</p> : null}
      </div>

      <div className="flex gap-4 items-center">
        <button
          type="button"
          onClick={isConnected ? disconnect : connect}
          disabled={isConnecting}
          className={cn(
            "inline-flex h-12 w-32 items-center justify-center rounded-md text-sm font-bold transition-all disabled:opacity-50",
            !isConnected && "bg-white text-black hover:bg-zinc-200",
            isConnected && "bg-rose-500 text-white hover:bg-rose-600 border border-rose-600",
            isConnecting && "bg-zinc-800 text-zinc-400"
          )}
        >
          {isConnecting ? <Spinner /> : isConnected ? "End Call" : "Connect"}
        </button>

        {isConnected && (
          <button
            type="button"
            onClick={toggleMute}
            className={cn(
               "inline-flex h-12 w-32 items-center justify-center rounded-md border text-sm font-bold transition-all",
               isMicMuted 
                 ? "bg-red-500/20 border-red-500/50 text-red-500 hover:bg-red-500/30" 
                 : "bg-[#050505] border-zinc-700 text-white hover:bg-zinc-800 hover:text-white"
            )}
          >
            {isMicMuted ? "Resume Mic" : "Pause Mic"}
          </button>
        )}
      </div>
    </div>
  );
}
