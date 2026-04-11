import { describe, expect, it } from "vitest";

import { SessionTurn } from "@/models/SessionTurn";

describe("SessionTurn model", () => {
  it("enforces required turn fields", () => {
    const invalidDocument = new SessionTurn({
      mode: "chat",
      role: "user",
    });

    const validationError = invalidDocument.validateSync();

    expect(validationError?.errors.userId).toBeDefined();
    expect(validationError?.errors.sessionId).toBeDefined();
    expect(validationError?.errors.content).toBeDefined();
  });

  it("defines retrieval and idempotency indexes", () => {
    const indexes = SessionTurn.schema.indexes();

    const retrievalIndex = indexes.find(
      ([keys]) =>
        keys.userId === 1 && keys.sessionId === 1 && keys.createdAt === -1
    );
    expect(retrievalIndex).toBeDefined();

    const dedupeIndex = indexes.find(
      ([keys, options]) =>
        keys.userId === 1 &&
        keys.sessionId === 1 &&
        keys.turnId === 1 &&
        options?.unique === true
    );

    expect(dedupeIndex).toBeDefined();
    if (!dedupeIndex) {
      return;
    }

    expect(dedupeIndex[1]).toMatchObject({
      unique: true,
      partialFilterExpression: {
        turnId: {
          $exists: true,
          $type: "string",
        },
      },
    });
  });
});
