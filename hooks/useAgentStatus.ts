"use client";

import { useAgentStatusStore } from "@/store/agent-status";

export function useAgentStatus() {
  const status = useAgentStatusStore((state) => state.status);
  const message = useAgentStatusStore((state) => state.message);
  const setStatus = useAgentStatusStore((state) => state.setStatus);
  const reset = useAgentStatusStore((state) => state.reset);

  return { status, message, setStatus, reset };
}
