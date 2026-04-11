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

import { runMemoryAgent } from "@/agents/memory-agent";

describe("runMemoryAgent", () => {
  beforeEach(() => {
    generateObjectMock.mockReset();
    geminiFlashMock.mockReset();
    geminiFlashMock.mockReturnValue("gemini-vertex-model");
  });

  it("extracts themes and emotions from transcript", async () => {
    generateObjectMock.mockResolvedValue({
      object: {
        themes: ["impulse_purchase"],
        emotions: {
          primary: "stress",
          intensity: 0.7,
          markers: ["rough week"],
        },
        decisionPoints: [],
        stressScore: 0.65,
        summary: "User had a rough week and made impulse purchases.",
      },
    });

    const result = await runMemoryAgent(
      "Had a rough week. Bought some stuff I did not need."
    );

    expect(result.themes).toContain("impulse_purchase");
    expect(result.emotions.primary).toBe("stress");
    expect(result.stressScore).toBeGreaterThan(0.5);
    expect(generateObjectMock).toHaveBeenCalledTimes(1);
    expect(generateObjectMock).toHaveBeenCalledWith(
      expect.objectContaining({
        providerOptions: {
          vertex: {
            streamFunctionCallArguments: false,
          },
        },
      })
    );
  });
});
