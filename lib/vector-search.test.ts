import { beforeEach, describe, expect, it, vi } from "vitest";

const { connectDBMock, embedMock, aggregateMock } = vi.hoisted(() => ({
  connectDBMock: vi.fn(),
  embedMock: vi.fn(),
  aggregateMock: vi.fn(),
}));

vi.mock("@/lib/mongodb", () => ({
  connectDB: connectDBMock,
}));

vi.mock("@/lib/embeddings", () => ({
  embed: embedMock,
}));

vi.mock("@/models/MemoryEntry", () => ({
  MemoryEntry: {
    aggregate: aggregateMock,
  },
}));

import { findSimilarMemories } from "@/lib/vector-search";

describe("findSimilarMemories", () => {
  beforeEach(() => {
    connectDBMock.mockReset();
    embedMock.mockReset();
    aggregateMock.mockReset();
  });

  it("builds vector search pipeline that excludes embedding field", async () => {
    connectDBMock.mockResolvedValue(undefined);
    embedMock.mockResolvedValue([0.11, 0.22, 0.33]);
    aggregateMock.mockResolvedValue([]);

    await findSimilarMemories("user-1", "query text", {
      limit: 5,
      minScore: 0.8,
      themes: ["impulse_purchase"],
    });

    expect(connectDBMock).toHaveBeenCalledTimes(1);
    expect(embedMock).toHaveBeenCalledWith("query text");
    expect(aggregateMock).toHaveBeenCalledTimes(1);

    const pipeline = aggregateMock.mock.calls[0]?.[0] as Array<
      Record<string, unknown>
    >;

    const projectStage = pipeline.find((stage) =>
      Object.prototype.hasOwnProperty.call(stage, "$project")
    ) as { $project?: Record<string, unknown> } | undefined;

    expect(projectStage?.$project?.embedding).toBe(0);
  });

  it("throws when userId is empty", async () => {
    await expect(findSimilarMemories(" ", "query text")).rejects.toThrow(
      "userId is required for memory vector search"
    );
    expect(connectDBMock).not.toHaveBeenCalled();
  });
});
