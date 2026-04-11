import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  generateObjectMock,
  runMemoryAgentMock,
  geminiFlashMock,
  embedMock,
  connectDBMock,
  createMock,
  findMock,
  findOneAndUpdateMock,
} = vi.hoisted(() => ({
  generateObjectMock: vi.fn(),
  runMemoryAgentMock: vi.fn(),
  geminiFlashMock: vi.fn(),
  embedMock: vi.fn(),
  connectDBMock: vi.fn(),
  createMock: vi.fn(),
  findMock: vi.fn(),
  findOneAndUpdateMock: vi.fn(),
}));

vi.mock("ai", () => ({
  generateObject: generateObjectMock,
}));

vi.mock("@/agents/memory-agent", () => ({
  runMemoryAgent: runMemoryAgentMock,
}));

vi.mock("@/lib/gemini", () => ({
  geminiFlash: geminiFlashMock,
}));

vi.mock("@/lib/embeddings", () => ({
  embed: embedMock,
}));

vi.mock("@/lib/mongodb", () => ({
  connectDB: connectDBMock,
}));

vi.mock("@/models/MemoryEntry", () => ({
  MemoryEntry: {
    create: createMock,
    find: findMock,
    findOneAndUpdate: findOneAndUpdateMock,
  },
}));

import { persistRealtimeTurnMemory } from "@/lib/realtime-memory";

describe("persistRealtimeTurnMemory", () => {
  beforeEach(() => {
    generateObjectMock.mockReset();
    runMemoryAgentMock.mockReset();
    geminiFlashMock.mockReset();
    embedMock.mockReset();
    connectDBMock.mockReset();
    createMock.mockReset();
    findMock.mockReset();
    findOneAndUpdateMock.mockReset();

    geminiFlashMock.mockReturnValue("gemini-vertex-model");

    runMemoryAgentMock.mockResolvedValue({
      themes: ["budgeting"],
      emotions: {
        primary: "stress",
        intensity: 0.7,
        markers: ["pressure"],
      },
      decisionPoints: [],
      stressScore: 0.7,
      summary: "User is under budget pressure.",
    });

    embedMock.mockResolvedValue([0.1, 0.2]);
    createMock.mockResolvedValue({
      _id: "turn-entry-1",
      createdAt: new Date("2026-01-01T10:00:00.000Z"),
      transcript: "I am worried about my spending",
      responseText: "Let's tighten your weekly cap.",
      summary: "User is under budget pressure.",
      stressScore: 0.7,
    });

    findMock.mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([
          {
            createdAt: new Date("2026-01-01T10:00:00.000Z"),
            transcript: "I am worried about my spending",
            responseText: "Let's tighten your weekly cap.",
            summary: "User is under budget pressure.",
            stressScore: 0.7,
          },
        ]),
      }),
    });

    generateObjectMock.mockResolvedValue({
      object: {
        summary: "User is reconsidering spending and setting stricter weekly caps.",
        keyDecisions: ["Set a weekly discretionary cap"],
        riskSignals: ["Stress-driven impulse purchases"],
      },
    });

    findOneAndUpdateMock.mockResolvedValue({
      _id: "rolling-summary-entry-1",
    });
  });

  it("persists realtime turn memory immediately (fast path) and fires background rolling summary", async () => {
    const result = await persistRealtimeTurnMemory({
      userId: "user-1",
      sessionId: "session-1",
      mode: "chat",
      userMessage: "I am worried about my spending",
      assistantMessage: "Let's tighten your weekly cap.",
      turnIndex: 1,
    });

    // Fast path: turn entry is created synchronously
    expect(connectDBMock).toHaveBeenCalled();
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        sessionId: "session-1",
        mode: "chat",
        source: "realtime_turn",
      })
    );

    // Fast path result: only turnEntryId is guaranteed; rolling summary is background
    expect(result.turnEntryId).toBe("turn-entry-1");
    // rollingSummaryEntryId is no longer returned from the fast path
    expect(result.rollingSummaryEntryId).toBeUndefined();
    expect(result.rollingSummary).toBeUndefined();
  });

  it("falls back when memory extraction parsing fails", async () => {
    runMemoryAgentMock.mockReset();
    runMemoryAgentMock.mockRejectedValue(
      new Error("AI_NoObjectGeneratedError: malformed object")
    );
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      const result = await persistRealtimeTurnMemory({
        userId: "user-1",
        sessionId: "session-1",
        mode: "chat",
        userMessage: "I am worried about my spending",
        assistantMessage: "Let's tighten your weekly cap.",
      });

      expect(result.turnEntryId).toBe("turn-entry-1");
      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-1",
          source: "realtime_turn",
          summary: expect.stringContaining("worried about my spending"),
          emotions: expect.objectContaining({
            primary: "anxiety",
          }),
        })
      );

      const loggedErrors = consoleErrorSpy.mock.calls.map(([entry]) => entry);
      expect(loggedErrors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            userId: "user-1",
            operation: "turnMemoryExtractionFallback",
            error: expect.stringContaining("AI_NoObjectGeneratedError"),
          }),
        ])
      );
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  it("falls back when rolling summary object generation fails (background)", async () => {
    generateObjectMock.mockRejectedValue(
      new Error("AI_NoObjectGeneratedError: invalid summary object")
    );
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      const result = await persistRealtimeTurnMemory({
        userId: "user-1",
        sessionId: "session-1",
        mode: "chat",
        userMessage: "I am worried about my spending",
        assistantMessage: "Let's tighten your weekly cap.",
      });

      // Fast path still returns successfully even if background job will fail
      expect(result.turnEntryId).toBe("turn-entry-1");
      expect(result.rollingSummary).toBeUndefined();
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  it("throws when userId is missing", async () => {
    await expect(
      persistRealtimeTurnMemory({
        userId: " ",
        sessionId: "session-1",
        mode: "voice",
        userMessage: "test",
      })
    ).rejects.toThrow("userId is required for realtime memory persistence");
  });
});
