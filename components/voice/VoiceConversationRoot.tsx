"use client";

import { ConversationProvider } from "@elevenlabs/react";
import { useCallback, useEffect, useRef } from "react";

import { KoraVoiceInterface } from "@/components/voice/KoraVoiceInterface";
import { MicWaveform } from "@/components/voice/MicWaveform";
import { useConversationStore } from "@/store/conversation";

function extractEventText(event: unknown): string | null {
  if (!event || typeof event !== "object") {
    return null;
  }

  const record = event as Record<string, unknown>;
  const directTextKeys = ["text", "transcript", "message"];
  for (const key of directTextKeys) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }

  const nestedMessage = record.message;
  if (nestedMessage && typeof nestedMessage === "object") {
    const nested = nestedMessage as Record<string, unknown>;
    if (typeof nested.text === "string" && nested.text.trim().length > 0) {
      return nested.text;
    }
  }

  return null;
}

function inferRole(event: unknown): "user" | "assistant" {
  if (!event || typeof event !== "object") {
    return "assistant";
  }

  const record = event as Record<string, unknown>;
  const type = typeof record.type === "string" ? record.type : "";
  if (type.includes("user")) {
    return "user";
  }

  return "assistant";
}

interface VoiceConversationRootProps {
  sessionId: string;
  onSessionEnded?: () => Promise<void> | void;
  onTurnPersisted?: (payload: {
    turnEntryId: string;
    rollingSummary: string;
    rollingSummaryEntryId: string;
    financeSnapshot?: VoiceFinanceSnapshot | null;
  }) => void;
}

interface VoiceFinanceSnapshot {
  fetchedAt: string;
  summary: string;
  quotes: Array<{
    symbol: string;
    name: string;
    price: number | null;
    changePercent: number | null;
    currency: string | null;
  }>;
}

interface PersistTurnResponse {
  /** Present on 200 synchronous responses; absent on 202 fire-and-forget */
  turnEntryId?: string;
  rollingSummary?: string;
  rollingSummaryEntryId?: string;
  financeSnapshot?: VoiceFinanceSnapshot | null;
  /** HTTP 202: server accepted the turn for background processing */
  accepted?: boolean;
  error?: string;
}

export function VoiceConversationRoot({
  sessionId,
  onSessionEnded,
  onTurnPersisted,
}: VoiceConversationRootProps) {
  const addMessage = useConversationStore((state) => state.addMessage);
  const appendTranscript = useConversationStore((state) => state.appendTranscript);
  const setLastAlert = useConversationStore((state) => state.setLastAlert);
  const pendingUserTurn = useRef<string | null>(null);
  const lastPersistedPair = useRef<string | null>(null);
  const turnIndex = useRef(0);

  useEffect(() => {
    pendingUserTurn.current = null;
    lastPersistedPair.current = null;
    turnIndex.current = 0;
  }, [sessionId]);

  const persistTurn = useCallback(
    async (userMessage: string, assistantMessage: string) => {
      const response = await fetch("/api/checkin/memory", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          mode: "voice",
          userMessage,
          assistantMessage,
          turnIndex: turnIndex.current,
        }),
      });

      // The server returns 202 Accepted immediately — persistence is background-only
      if (response.status === 202) {
        // Notify UI that memory is being saved (summary arrives later)
        if (onTurnPersisted) {
          onTurnPersisted({
            turnEntryId: `pending-${Date.now()}`,
            rollingSummary: "Saving to memory…",
            rollingSummaryEntryId: "",
            financeSnapshot: null,
          });
        }
        return;
      }

      if (!response.ok) {
        let errorMsg = "Realtime voice memory persistence failed";
        try {
          const payload: PersistTurnResponse = await response.json();
          errorMsg = payload.error ?? errorMsg;
        } catch {
          // ignore parse error, use default
        }
        throw new Error(errorMsg);
      }

      const payload: PersistTurnResponse = await response.json();
      if (
        payload.turnEntryId &&
        payload.rollingSummary &&
        payload.rollingSummaryEntryId &&
        onTurnPersisted
      ) {
        onTurnPersisted({
          turnEntryId: payload.turnEntryId,
          rollingSummary: payload.rollingSummary,
          rollingSummaryEntryId: payload.rollingSummaryEntryId,
          financeSnapshot: payload.financeSnapshot,
        });
      }
    },
    [onTurnPersisted, sessionId]
  );

  return (
    <ConversationProvider
      clientTools={{
        showMemory: ({ memoryId }: { memoryId: string }) => {
          return `Memory ${memoryId} surfaced`;
        },
        showPatternAlert: ({
          patternTitle,
          message,
        }: {
          patternTitle: string;
          message: string;
        }) => {
          setLastAlert({ patternTitle, message });
          return "Pattern alert displayed";
        },
      }}
      onMessage={({ message, source }) => {
        const text = extractEventText(message);
        if (!text) {
          return;
        }

        const role =
          source === "user"
            ? "user"
            : source === "ai"
              ? "assistant"
              : inferRole(message);
        addMessage({
          role,
          content: text,
          timestamp: new Date().toISOString(),
        });

        if (role === "user") {
          pendingUserTurn.current = text;
          appendTranscript(text);
          return;
        }

        const userMessage = pendingUserTurn.current;
        if (!userMessage) {
          return;
        }

        const pairKey = `${userMessage}::${text}`;
        if (pairKey === lastPersistedPair.current) {
          return;
        }

        lastPersistedPair.current = pairKey;
        turnIndex.current += 1;
        pendingUserTurn.current = null;

        void persistTurn(userMessage, text).catch((error) => {
          console.error({
            operation: "voice-realtime-memory-persist",
            error: error instanceof Error ? error.message : String(error),
          });
        });
      }}
      onError={(error) => {
        const normalizedError =
          typeof error === "string" ? error : JSON.stringify(error);
        if (normalizedError.toLowerCase().includes("pc connection")) {
          console.warn({
            operation: "elevenlabs-conversation",
            error: normalizedError,
            note: "WebRTC failed; websocket fallback may connect",
          });
          return;
        }

        console.error({
          operation: "elevenlabs-conversation",
          error: normalizedError,
        });
      }}
    >
      <div className="space-y-4">
        <KoraVoiceInterface onSessionEnded={onSessionEnded} />
        <MicWaveform />
      </div>
    </ConversationProvider>
  );
}
