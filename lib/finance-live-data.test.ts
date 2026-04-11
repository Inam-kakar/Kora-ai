import { afterEach, describe, expect, it, vi } from "vitest";

import { formatFinanceContext, getFinanceSnapshot } from "@/lib/finance-live-data";

describe("finance-live-data", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null when query is not finance-related", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const snapshot = await getFinanceSnapshot("How was your day?");

    expect(snapshot).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("fetches and normalizes Yahoo Finance quote data", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          quoteResponse: {
            result: [
              {
                symbol: "AAPL",
                shortName: "Apple Inc.",
                regularMarketPrice: 212.34,
                regularMarketChangePercent: 1.25,
                currency: "USD",
                marketState: "REGULAR",
              },
            ],
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    );

    const snapshot = await getFinanceSnapshot("Should I buy $AAPL this week?");
    expect(snapshot).not.toBeNull();
    expect(snapshot?.quotes[0]).toMatchObject({
      symbol: "AAPL",
      name: "Apple Inc.",
      price: 212.34,
      changePercent: 1.25,
      currency: "USD",
      source: "Yahoo Finance",
    });

    const context = formatFinanceContext(snapshot);
    expect(context).toContain("AAPL");
    expect(context).toContain("Yahoo Finance");
  });

  it("returns an empty snapshot when Yahoo responds unauthorized", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("Unauthorized", {
        status: 401,
        headers: { "Content-Type": "text/plain" },
      })
    );

    const snapshot = await getFinanceSnapshot("Should I buy $TSLA this month?");

    expect(snapshot).not.toBeNull();
    expect(snapshot?.symbols).toEqual(["TSLA"]);
    expect(snapshot?.quotes).toEqual([]);
    expect(snapshot?.summary).toContain("blocked");
    expect(formatFinanceContext(snapshot)).toBe("");
  });

  it("treats access-denied payloads as blocked even with non-401 status", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("<html><body>Access Denied</body></html>", {
        status: 503,
        headers: { "Content-Type": "text/html" },
      })
    );

    const snapshot = await getFinanceSnapshot("What is the outlook for SPY?");

    expect(snapshot).not.toBeNull();
    expect(snapshot?.symbols).toEqual(["SPY"]);
    expect(snapshot?.quotes).toEqual([]);
    expect(snapshot?.summary).toContain("blocked");
  });
});
