"use client";

import { useCallback, useState, type FormEvent } from "react";

import { VoiceConversationRoot } from "@/components/voice/VoiceConversationRoot";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAgentStatus } from "@/hooks/useAgentStatus";
import { useConversationStore } from "@/store/conversation";

type CheckinMode = "voice" | "chat";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface FinanceQuote {
  symbol: string;
  name: string;
  price: number | null;
  changePercent: number | null;
  currency: string | null;
}

interface FinanceSnapshot {
  fetchedAt: string;
  quotes: FinanceQuote[];
  summary: string;
}

interface TurnPersistedPayload {
  turnEntryId: string;
  rollingSummary: string;
  rollingSummaryEntryId: string;
  financeSnapshot?: FinanceSnapshot | null;
}

export default function CheckinPage() {
  const transcript = useConversationStore((state) => state.transcript);
  const resetConversation = useConversationStore((state) => state.reset);
  const setConversationStatus = useConversationStore((state) => state.setAgentStatus);
  const { status, message, setStatus } = useAgentStatus();

  const [mode, setMode] = useState<CheckinMode>("voice");
  const [voiceSessionId, setVoiceSessionId] = useState(() => crypto.randomUUID());
  const [chatSessionId] = useState(() => crypto.randomUUID());
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatSubmitting, setChatSubmitting] = useState(false);
  const [rollingSummary, setRollingSummary] = useState<string | null>(null);
  const [latestTurnEntryId, setLatestTurnEntryId] = useState<string | null>(null);
  const [latestFinanceSnapshot, setLatestFinanceSnapshot] =
    useState<FinanceSnapshot | null>(null);

  const onModeChange = useCallback(
    (nextMode: CheckinMode) => {
      setMode(nextMode);
      setStatus(
        "idle",
        nextMode === "voice"
          ? "Voice mode is ready."
          : "Chat mode is ready."
      );
      setConversationStatus("idle");
    },
    [setConversationStatus, setStatus]
  );

  const resetVoiceSession = useCallback(() => {
    setVoiceSessionId(crypto.randomUUID());
    resetConversation();
    setStatus("idle", "Voice session reset.");
    setConversationStatus("idle");
  }, [resetConversation, setConversationStatus, setStatus]);

  const onVoiceTurnPersisted = useCallback(
    (payload: TurnPersistedPayload) => {
      setRollingSummary(payload.rollingSummary);
      setLatestTurnEntryId(payload.turnEntryId);
      setLatestFinanceSnapshot(payload.financeSnapshot ?? null);
      setStatus("complete", "Voice memory updated in realtime.");
      setConversationStatus("complete");
    },
    [setConversationStatus, setStatus]
  );

  const onChatSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!chatInput.trim() || chatSubmitting) {
        return;
      }

      const userMessage = chatInput.trim();
      const history = chatMessages.map((entry) => ({
        role: entry.role,
        content: entry.content,
      }));

      setChatInput("");
      // Add the user message immediately
      setChatMessages((previous) => [
        ...previous,
        {
          role: "user",
          content: userMessage,
          timestamp: new Date().toISOString(),
        },
      ]);
      // Add a placeholder assistant message that will stream in
      setChatMessages((previous) => [
        ...previous,
        {
          role: "assistant",
          content: "",
          timestamp: new Date().toISOString(),
        },
      ]);
      setStatus("processing", "Generating response...");
      setConversationStatus("processing");
      setChatSubmitting(true);

      try {
        const response = await fetch("/api/checkin/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: chatSessionId,
            message: userMessage,
            history,
          }),
        });

        if (!response.ok) {
          // Try to parse error body
          let errMsg = "Chat mode request failed";
          try {
            const errBody = (await response.json()) as { error?: string };
            errMsg = errBody.error ?? errMsg;
          } catch {
            // ignore
          }
          throw new Error(errMsg);
        }

        if (!response.body) {
          throw new Error("No response body");
        }

        // Stream plain text chunks into the last assistant message.
        // toTextStreamResponse() sends raw UTF-8 text deltas with no prefix.
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          accumulatedText += chunk;
          setChatMessages((previous) => {
            const updated = [...previous];
            const last = updated[updated.length - 1];
            if (last?.role === "assistant") {
              updated[updated.length - 1] = {
                ...last,
                content: accumulatedText,
              };
            }
            return updated;
          });
        }

        // Memory is persisted in background — update status indicator
        setStatus("complete", "Memory saving in background…");
        setConversationStatus("complete");
      } catch (error) {
        // Remove the empty placeholder assistant message on error
        setChatMessages((previous) => {
          const updated = [...previous];
          if (updated.at(-1)?.role === "assistant" && !updated.at(-1)?.content) {
            updated.pop();
          }
          return updated;
        });
        setStatus(
          "error",
          error instanceof Error ? error.message : "Chat request failed"
        );
        setConversationStatus("error");
      } finally {
        setChatSubmitting(false);
      }
    },
    [
      chatInput,
      chatMessages,
      chatSessionId,
      chatSubmitting,
      setConversationStatus,
      setStatus,
    ]
  );

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <Card className="space-y-4">
        <h1 className="text-2xl font-semibold text-slate-100">
          Voice & chat check-in
        </h1>
        <p className="text-sm text-slate-300">
          Voice mode uses ElevenLabs realtime conversation. Chat mode uses Gemini
          with live memory retrieval.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={mode === "voice" ? "primary" : "ghost"}
            onClick={() => onModeChange("voice")}
          >
            Voice mode
          </Button>
          <Button
            variant={mode === "chat" ? "primary" : "ghost"}
            onClick={() => onModeChange("chat")}
          >
            Chat mode
          </Button>
          <Badge tone="neutral">Status: {status}</Badge>
        </div>
      </Card>

      {mode === "voice" ? (
        <Card className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-slate-100">
              ElevenLabs realtime conversation
            </h2>
            <Button variant="secondary" onClick={resetVoiceSession}>
              New voice session
            </Button>
          </div>
          <VoiceConversationRoot
            sessionId={voiceSessionId}
            onSessionEnded={() => {
              setStatus("idle", "Voice session ended.");
              setConversationStatus("idle");
            }}
            onTurnPersisted={onVoiceTurnPersisted}
          />
        </Card>
      ) : (
        <Card className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-100">
            Gemini chat conversation
          </h2>
          <div className="max-h-80 space-y-2 overflow-auto rounded-md border border-slate-800 bg-slate-950/70 p-3">
            {chatMessages.length === 0 ? (
              <p className="text-sm text-slate-400">
                Start chatting. Each completed turn is persisted to memory in
                realtime.
              </p>
            ) : (
              chatMessages.map((entry, index) => (
                <div
                  key={`${entry.timestamp}-${index}`}
                  className={`rounded-md px-3 py-2 text-sm ${
                    entry.role === "user"
                      ? "bg-indigo-600/20 text-indigo-100"
                      : "bg-slate-800 text-slate-100"
                  }`}
                >
                  <p className="mb-1 text-[11px] uppercase tracking-wide text-slate-300">
                    {entry.role}
                  </p>
                  <p className="whitespace-pre-wrap">{entry.content}</p>
                </div>
              ))
            )}
          </div>

          <form className="flex gap-2" onSubmit={onChatSubmit}>
            <input
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              placeholder="Type your financial question or update..."
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            />
            <Button type="submit" disabled={chatSubmitting}>
              {chatSubmitting ? "Sending..." : "Send"}
            </Button>
          </form>
        </Card>
      )}

      {mode === "voice" ? (
        <Card className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-100">Voice transcript</h2>
          <p className="max-h-40 overflow-auto whitespace-pre-wrap text-sm text-slate-300">
            {transcript || "No transcript captured yet."}
          </p>
        </Card>
      ) : null}

      <Card className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-100">
          Realtime conversation memory
        </h2>
        <p className="text-sm text-slate-300">
          {rollingSummary ?? "Summary will appear after the first completed turn."}
        </p>
        {latestTurnEntryId ? (
          <Badge tone="low">Latest memory entry: {latestTurnEntryId}</Badge>
        ) : null}
      </Card>

      {latestFinanceSnapshot?.quotes?.length ? (
        <Card className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-100">
            Live finance data (Yahoo Finance)
          </h2>
          <p className="text-xs text-slate-400">
            Updated at {new Date(latestFinanceSnapshot.fetchedAt).toLocaleString()}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {latestFinanceSnapshot.quotes.map((quote) => (
              <div
                key={quote.symbol}
                className="rounded-md border border-slate-800 bg-slate-950/60 p-3"
              >
                <p className="text-sm font-medium text-slate-100">
                  {quote.symbol} {quote.name ? `(${quote.name})` : ""}
                </p>
                <p className="text-sm text-slate-300">
                  {quote.price === null ? "n/a" : quote.price.toFixed(2)}{" "}
                  {quote.currency ?? ""}
                </p>
                <p className="text-xs text-slate-400">
                  {quote.changePercent === null
                    ? "change n/a"
                    : `${quote.changePercent > 0 ? "+" : ""}${quote.changePercent.toFixed(
                        2
                      )}%`}
                </p>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <Card className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-100">Agent status</h2>
        <p className="text-sm text-slate-300">{message ?? "Idle"}</p>
      </Card>
    </div>
  );
}
