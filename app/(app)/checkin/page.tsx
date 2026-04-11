"use client";

import { useCallback, useState, type FormEvent } from "react";
import { Mic, MessageSquare, Plus, Activity, Clock, Server, ArrowRight, BrainCircuit, FileText } from "lucide-react";

import { VoiceConversationRoot } from "@/components/voice/VoiceConversationRoot";
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
      setChatMessages((previous) => [
        ...previous,
        {
          role: "user",
          content: userMessage,
          timestamp: new Date().toISOString(),
        },
      ]);
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
          let errMsg = "Chat mode request failed";
          try {
            const errBody = (await response.json()) as { error?: string };
            errMsg = errBody.error ?? errMsg;
          } catch {}
          throw new Error(errMsg);
        }

        if (!response.body) {
          throw new Error("No response body");
        }

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

        setStatus("complete", "Memory saving in background…");
        setConversationStatus("complete");
      } catch (error) {
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
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
      
      {/* Header / Mode Picker */}
      <div className="flex flex-col md:flex-row md:items-end justify-between items-start gap-4 mb-2">
        <div>
           <div className="flex items-center gap-2 mb-2">
              <div className={`h-2 w-2 rounded-full ${status === 'error' ? 'bg-red-500' : status === 'processing' ? 'bg-yellow-500 animate-pulse' : 'bg-emerald-500'} animate-pulse`} />
              <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">
                 System: {status.toUpperCase()}
              </span>
           </div>
           <h1 className="text-3xl font-extrabold tracking-tight text-white mb-1">
             Financial Check-in
           </h1>
           <p className="text-sm text-zinc-400">Log your entry using ElevenLabs WebRTC Voice or Gemini Text Chat.</p>
        </div>
        
        <div className="flex items-center rounded-lg bg-zinc-900 border border-zinc-800 p-1">
          <button
            onClick={() => onModeChange("voice")}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              mode === "voice" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
            }`}
          >
            <Mic className="h-4 w-4" /> Voice
          </button>
          <button
            onClick={() => onModeChange("chat")}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              mode === "chat" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
            }`}
          >
            <MessageSquare className="h-4 w-4" /> Chat
          </button>
        </div>
      </div>

      {/* Main Interface Block */}
      <div className="rounded-xl border border-zinc-800 bg-[#0A0A0A] overflow-hidden">
        {mode === "voice" ? (
          <div className="flex flex-col h-full min-h-[400px]">
            <div className="border-b border-zinc-800 bg-[#0F0F0F] px-6 py-4 flex flex-wrap gap-4 items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                 <Mic className="h-4 w-4 text-zinc-400" /> ElevenLabs Voice Link
              </h2>
              <button 
                 className="flex items-center gap-2 rounded bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 border border-zinc-800 hover:bg-zinc-800 hover:text-white transition-colors"
                 onClick={resetVoiceSession}
              >
                 <Plus className="h-3 w-3" /> New Session
              </button>
            </div>
            <div className="p-6 flex-grow flex items-center justify-center">
              <VoiceConversationRoot
                sessionId={voiceSessionId}
                onSessionEnded={() => {
                  setStatus("idle", "Voice session ended.");
                  setConversationStatus("idle");
                }}
                onTurnPersisted={onVoiceTurnPersisted}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full max-h-[600px]">
            <div className="border-b border-zinc-800 bg-[#0F0F0F] px-6 py-4 flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                 <Server className="h-4 w-4 text-zinc-400" /> Gemini Extraction Chat
              </h2>
            </div>
            
            <div className="flex-grow overflow-y-auto p-6 space-y-4 bg-[#050505] min-h-[400px]">
              {chatMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-70">
                   <MessageSquare className="h-8 w-8 text-zinc-600 mb-3" />
                   <p className="text-sm text-zinc-400">Start typing. Every submitted message is parsed structually by Gemini.</p>
                </div>
              ) : (
                chatMessages.map((entry, index) => (
                  <div key={`${entry.timestamp}-${index}`} className={`flex ${entry.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                      entry.role === "user"
                        ? "bg-white text-black rounded-tr-sm"
                        : "bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-tl-sm"
                    }`}>
                      <p className="whitespace-pre-wrap leading-relaxed">{entry.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-zinc-800 bg-[#0F0F0F] p-4">
              <form className="relative flex items-center" onSubmit={onChatSubmit}>
                <input
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                  placeholder="Type your financial update..."
                  className="w-full rounded-full border border-zinc-800 bg-black pr-12 pl-4 py-3 text-sm text-slate-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all"
                />
                <button 
                  type="submit" 
                  disabled={chatSubmitting || !chatInput.trim()}
                  className="absolute right-2 flex h-8 w-8 items-center justify-center rounded-full bg-white text-black disabled:opacity-50 disabled:bg-zinc-800 disabled:text-zinc-500 transition-colors"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {mode === "voice" && transcript && (
        <div className="rounded-xl border border-zinc-800 bg-[#0A0A0A] overflow-hidden">
          <div className="border-b border-zinc-800 bg-[#0F0F0F] px-6 py-3 flex items-center">
             <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
                <FileText className="h-3 w-3" /> Live Transcript
             </h2>
          </div>
          <div className="p-6">
             <p className="max-h-32 overflow-auto whitespace-pre-wrap text-sm text-zinc-300 font-light leading-relaxed">
               {transcript}
             </p>
          </div>
        </div>
      )}

      {/* Memory & Context Block */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <div className="rounded-xl border border-zinc-800 bg-[#0A0A0A] p-6">
           <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
             <BrainCircuit className="h-4 w-4 text-zinc-400" /> Realtime Memory Logic
           </h2>
           <p className="text-sm text-zinc-400 font-light leading-relaxed mb-4">
             {rollingSummary ?? "Waiting for memory chunk extraction..."}
           </p>
           {latestTurnEntryId ? (
             <div className="mt-4 flex items-center gap-2 border-t border-zinc-800 pt-4">
                <span className="text-xs font-mono text-zinc-600">ID:</span>
                <span className="text-[10px] font-mono text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">{latestTurnEntryId}</span>
             </div>
           ) : null}
         </div>

         <div className="rounded-xl border border-zinc-800 bg-[#0A0A0A] p-6">
           <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
             <Activity className="h-4 w-4 text-zinc-400" /> Agent Console
           </h2>
           <div className="flex flex-col h-full justify-center">
              <span className="text-[11px] uppercase tracking-widest text-zinc-500 mb-1">Current Task</span>
              <p className="text-sm text-zinc-300 font-medium">{message ?? "Awaiting input."}</p>
           </div>
         </div>
      </div>

      {/* Finance Data Block */}
       {latestFinanceSnapshot?.quotes?.length ? (
        <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
          <div className="flex justify-between items-center mb-6">
             <h2 className="text-sm font-bold text-indigo-100 flex items-center gap-2">
               <Activity className="h-4 w-4 text-indigo-400" /> Live Market Context
             </h2>
             <span className="text-xs text-indigo-300/50 font-mono">
               <Clock className="h-3 w-3 inline mr-1 -mt-0.5" /> 
               {new Date(latestFinanceSnapshot.fetchedAt).toLocaleTimeString()}
             </span>
          </div>
          
          <div className="grid gap-3 sm:grid-cols-2">
            {latestFinanceSnapshot.quotes.map((quote) => (
              <div
                key={quote.symbol}
                className="rounded-lg border border-indigo-500/20 bg-indigo-500/10 p-4"
              >
                <div className="flex justify-between items-start mb-2">
                   <p className="text-sm font-bold text-indigo-100">
                     {quote.symbol}
                   </p>
                   <span className={`text-xs font-bold px-2 py-0.5 rounded ${quote.changePercent && quote.changePercent > 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                     {quote.changePercent === null ? "—" : `${quote.changePercent > 0 ? "+" : ""}${quote.changePercent.toFixed(2)}%`}
                   </span>
                </div>
                <p className="text-xs text-indigo-300/70 mb-2 truncate" title={quote.name}>{quote.name}</p>
                <p className="text-lg font-mono text-white">
                  {quote.price === null ? "n/a" : quote.price.toFixed(2)}{" "}
                  <span className="text-xs text-indigo-300">{quote.currency ?? ""}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      
    </div>
  );
}
