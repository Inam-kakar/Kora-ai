import { create } from "zustand";

export type PipelineStatus = "idle" | "processing" | "complete" | "error";

interface AgentStatusState {
  status: PipelineStatus;
  message: string | null;
  setStatus: (status: PipelineStatus, message?: string | null) => void;
  reset: () => void;
}

export const useAgentStatusStore = create<AgentStatusState>((set) => ({
  status: "idle",
  message: null,
  setStatus: (status, message = null) => set({ status, message }),
  reset: () => set({ status: "idle", message: null }),
}));
