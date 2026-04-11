import { beforeEach, describe, expect, it, vi } from "vitest";

const { sdkEmbedMock, geminiEmbeddingMock } = vi.hoisted(() => ({
  sdkEmbedMock: vi.fn(),
  geminiEmbeddingMock: vi.fn(),
}));

vi.mock("ai", () => ({
  embed: sdkEmbedMock,
}));

vi.mock("@/lib/gemini", () => ({
  geminiEmbedding: geminiEmbeddingMock,
}));

import { embed } from "@/lib/embeddings";

describe("embed", () => {
  beforeEach(() => {
    sdkEmbedMock.mockReset();
    geminiEmbeddingMock.mockReset();
  });

  it("returns embedding array from Gemini embedding response", async () => {
    geminiEmbeddingMock.mockReturnValue("gemini-embedding-model");
    sdkEmbedMock.mockResolvedValue({
      embedding: [0.1, 0.2, 0.3],
    });

    const result = await embed("hello world");
    expect(result).toEqual([0.1, 0.2, 0.3]);
    expect(sdkEmbedMock).toHaveBeenCalledTimes(1);
    expect(geminiEmbeddingMock).toHaveBeenCalledTimes(1);
  });
});
