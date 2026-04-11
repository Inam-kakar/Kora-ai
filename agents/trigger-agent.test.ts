import { beforeEach, describe, expect, it, vi } from "vitest";

const { generateObjectMock, geminiFlashMock } = vi.hoisted(() => ({
  generateObjectMock: vi.fn(),
  geminiFlashMock: vi.fn(),
}));

vi.mock("ai", () => ({
  generateObject: generateObjectMock,
}));

vi.mock("@/lib/gemini", () => ({
  geminiFlash: geminiFlashMock,
}));

import { runTriggerAgent } from "@/agents/trigger-agent";

describe("runTriggerAgent", () => {
  beforeEach(() => {
    generateObjectMock.mockReset();
    geminiFlashMock.mockReset();
    geminiFlashMock.mockReturnValue("gemini-vertex-model");
  });

  it("returns shouldAlert true for matched harmful pattern", async () => {
    generateObjectMock.mockResolvedValue({
      object: {
        shouldAlert: true,
        urgency: "high",
        matchedPattern: {
          id: "impulse-cycle",
          title: "Impulse Spending Cycle",
          similarity: 0.88,
        },
        alertMessage: "This sounds similar to your April impulse cycle.",
        memoriesToReplay: ["m1", "m2"],
      },
    });

    const result = await runTriggerAgent(
      "I want to make a fast purchase under stress.",
      [
        {
          id: "impulse-cycle",
          title: "Impulse Spending Cycle",
        },
      ],
      [{ id: "m1", summary: "Bought under pressure and regretted later." }]
    );

    expect(result.shouldAlert).toBe(true);
    expect(result.urgency).toBe("high");
    expect(result.matchedPattern?.id).toBe("impulse-cycle");
  });

  it("returns shouldAlert false when no strong match exists", async () => {
    generateObjectMock.mockResolvedValue({
      object: {
        shouldAlert: false,
      },
    });

    const result = await runTriggerAgent("Routine monthly budgeting.", [], []);
    expect(result.shouldAlert).toBe(false);
  });
});
