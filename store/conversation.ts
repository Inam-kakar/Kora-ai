import { create } from "zustand";

export type ConversationRole = "user" | "assistant" | "system";
export type AgentStatus = "idle" | "processing" | "complete" | "error";

export interface ConversationMessage {
  role: ConversationRole;
  content: string;
  timestamp: string;
}

export interface LastAlert {
  patternTitle: string;
  message: string;
}

interface ConversationState {
  messages: ConversationMessage[];
  transcript: string;
  agentStatus: AgentStatus;
  lastAlert: LastAlert | null;
  addMessage: (message: ConversationMessage) => void;
  setTranscript: (transcript: string) => void;
  appendTranscript: (chunk: string) => void;
  setAgentStatus: (status: AgentStatus) => void;
  setLastAlert: (alert: LastAlert | null) => void;
  reset: () => void;
}

const initialState = {
  messages: [],
  transcript: "",
  agentStatus: "idle" as AgentStatus,
  lastAlert: null,
};

export const useConversationStore = create<ConversationState>((set) => ({
  ...initialState,
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  setTranscript: (transcript) => set({ transcript }),
  appendTranscript: (chunk) =>
    set((state) => ({
      transcript: `${state.transcript}\n${chunk}`.trim(),
    })),
  setAgentStatus: (agentStatus) => set({ agentStatus }),
  setLastAlert: (lastAlert) => set({ lastAlert }),
  reset: () => set(initialState),
}));
