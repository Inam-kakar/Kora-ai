import { describe, expect, it } from "vitest";
import {
  MEMORY_JOB_STATUSES,
  MEMORY_JOB_TYPES,
  MemoryJob,
} from "@/models/MemoryJob";

describe("MemoryJob model", () => {
  it("defines expected job and status enums", () => {
    expect(MEMORY_JOB_TYPES).toEqual(
      expect.arrayContaining(["turn_ingest", "rolling_summary_update"])
    );
    expect(MEMORY_JOB_STATUSES).toEqual(
      expect.arrayContaining(["pending", "processing", "completed", "failed"])
    );
  });

  it("defines queue polling and user scoping indexes", () => {
    const indexes = MemoryJob.schema.indexes() as Array<
      [Record<string, number>, Record<string, unknown>]
    >;

    expect(
      indexes.some(
        ([keys]) =>
          keys.status === 1 && keys.runAfter === 1 && keys.createdAt === 1
      )
    ).toBe(true);
    expect(
      indexes.some(
        ([keys]) =>
          keys.userId === 1 &&
          keys.status === 1 &&
          keys.runAfter === 1 &&
          keys.createdAt === 1
      )
    ).toBe(true);
    expect(
      indexes.some(
        ([keys]) =>
          keys.userId === 1 && keys.sessionId === 1 && keys.createdAt === -1
      )
    ).toBe(true);
    expect(
      indexes.some(
        ([keys, options]) =>
          keys.idempotencyKey === 1 &&
          options.unique === true &&
          options.sparse === true
      )
    ).toBe(true);
  });

  it("sets queue defaults", () => {
    const job = new MemoryJob({
      userId: "user-1",
      sessionId: "session-1",
      jobType: "turn_ingest",
      payload: { turnId: "turn-1" },
    });

    expect(job.status).toBe("pending");
    expect(job.attempts).toBe(0);
    expect(job.maxAttempts).toBe(5);
    expect(job.runAfter).toBeInstanceOf(Date);
  });
});
