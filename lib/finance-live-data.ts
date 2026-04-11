const FINANCE_KEYWORDS =
  /\b(stock|stocks|share|shares|equity|market|price|ticker|nasdaq|dow|sp500|s&p|bond|yield|treasury|etf|crypto|bitcoin|btc|ethereum|eth)\b/i;

const COMMON_TICKER_STOPWORDS = new Set([
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "ROI",
  "IRA",
  "ETF",
  "CEO",
  "CFO",
  "GDP",
  "CPI",
  "FED",
]);

const DEFAULT_MARKET_SYMBOLS = ["SPY", "QQQ", "^TNX"];
const YAHOO_BLOCKED_STATUS_CODES = new Set([401, 403, 429]);
const YAHOO_BLOCKED_MARKERS = [
  "access denied",
  "forbidden",
  "invalid crumb",
  "not authorized",
  "rate limit",
  "request denied",
  "too many requests",
  "unauthorized",
];

export interface FinanceQuote {
  symbol: string;
  name: string;
  price: number | null;
  changePercent: number | null;
  currency: string | null;
  marketState: string | null;
  source: "Yahoo Finance";
}

export interface FinanceSnapshot {
  query: string;
  fetchedAt: string;
  symbols: string[];
  quotes: FinanceQuote[];
  summary: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

/**
 * Safely coerce a value to a finite number.
 * Yahoo Finance v7 can return either a plain number OR a nested object
 * like `{ raw: 540.23, fmt: "540.23" }`. Both forms are handled here.
 */
function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  // Nested { raw: number } form
  if (isRecord(value) && typeof value.raw === "number" && Number.isFinite(value.raw)) {
    return value.raw;
  }
  // String that looks like a number (rare, but defensive)
  if (typeof value === "string") {
    const parsed = parseFloat(value.replace(/,/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function titleCase(text: string): string {
  return text
    .split(" ")
    .filter(Boolean)
    .map((token) => token[0].toUpperCase() + token.slice(1).toLowerCase())
    .join(" ");
}

function inferSymbols(text: string): string[] {
  const symbols = new Set<string>();

  const explicit = text.match(/\$[A-Za-z]{1,5}\b/g) ?? [];
  for (const match of explicit) {
    symbols.add(match.slice(1).toUpperCase());
  }

  const uppercaseTokens = text.match(/\b[A-Z]{2,5}\b/g) ?? [];
  for (const token of uppercaseTokens) {
    if (!COMMON_TICKER_STOPWORDS.has(token)) {
      symbols.add(token.toUpperCase());
    }
  }

  if (/\bbitcoin|btc\b/i.test(text)) {
    symbols.add("BTC-USD");
  }

  if (/\bethereum|eth\b/i.test(text)) {
    symbols.add("ETH-USD");
  }

  return [...symbols].slice(0, 6);
}

function parseQuotes(payload: unknown): FinanceQuote[] {
  if (!isRecord(payload)) {
    return [];
  }

  const quoteResponse = payload.quoteResponse;
  if (!isRecord(quoteResponse) || !Array.isArray(quoteResponse.result)) {
    return [];
  }

  const parsedQuotes: FinanceQuote[] = [];
  for (const entry of quoteResponse.result) {
    if (!isRecord(entry)) {
      continue;
    }

    const symbol = asString(entry.symbol);
    if (!symbol) {
      continue;
    }

    const shortName = asString(entry.shortName);
    const longName = asString(entry.longName);

    const price = asNumber(entry.regularMarketPrice);
    const changePercent = asNumber(entry.regularMarketChangePercent);

    parsedQuotes.push({
      symbol,
      name: shortName ?? longName ?? symbol,
      // Round to sensible decimal places: ≥100 → 2dp, else 4dp (covers crypto)
      price: price !== null
        ? parseFloat(price.toFixed(price >= 1 ? 2 : 6))
        : null,
      changePercent: changePercent !== null
        ? parseFloat(changePercent.toFixed(3))
        : null,
      currency: asString(entry.currency),
      marketState: asString(entry.marketState),
      source: "Yahoo Finance",
    });
  }

  return parsedQuotes;
}

/**
 * Format a single quote for display in the LLM context or UI.
 * Uses locale-aware number formatting so prices like 5432.10 display as "5,432.10".
 */
function formatQuoteLine(quote: FinanceQuote): string {
  let priceStr = "n/a";
  if (quote.price !== null) {
    const decimals = quote.price >= 100 ? 2 : quote.price >= 1 ? 3 : 6;
    priceStr = quote.price.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: decimals,
    });
  }

  const change =
    quote.changePercent === null
      ? "n/a"
      : `${quote.changePercent > 0 ? "+" : ""}${quote.changePercent.toFixed(2)}%`;

  const currency = quote.currency ? ` ${quote.currency}` : "";
  const state =
    quote.marketState && quote.marketState !== "REGULAR"
      ? ` [${quote.marketState}]`
      : "";
  return `${quote.symbol}: ${priceStr}${currency} (${change})${state}`;
}

function isYahooBlockedResponse(status: number, responseBody: string): boolean {
  if (YAHOO_BLOCKED_STATUS_CODES.has(status)) {
    return true;
  }

  const normalizedBody = responseBody.toLowerCase();
  return YAHOO_BLOCKED_MARKERS.some((marker) => normalizedBody.includes(marker));
}

function createUnavailableSnapshot(
  normalizedQuery: string,
  symbols: string[],
  reason: "blocked" | "unavailable" = "unavailable"
): FinanceSnapshot {
  return {
    query: titleCase(normalizedQuery),
    fetchedAt: new Date().toISOString(),
    symbols,
    quotes: [],
    summary:
      reason === "blocked"
        ? "Yahoo Finance blocked the live quote request; returning no live data."
        : "Yahoo Finance live quote data is currently unavailable.",
  };
}

export function formatFinanceContext(snapshot: FinanceSnapshot | null): string {
  if (!snapshot || snapshot.quotes.length === 0) {
    return "";
  }

  const fetchTime = new Date(snapshot.fetchedAt).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  });

  return `\n\n## Live market data (Yahoo Finance, ${fetchTime})\n${snapshot.quotes
    .map((quote) => `- ${formatQuoteLine(quote)}`)
    .join("\n")}`;
}

/**
 * Fetch live quotes from Yahoo Finance.
 *
 * Uses the v7 quote endpoint with a short timeout and robust fallback.
 * Handles both the modern flat-number and legacy `{raw, fmt}` response shapes.
 */
export async function getFinanceSnapshot(query: string): Promise<FinanceSnapshot | null> {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    return null;
  }

  const inferredSymbols = inferSymbols(normalizedQuery);
  const shouldFetch = inferredSymbols.length > 0 || FINANCE_KEYWORDS.test(normalizedQuery);
  if (!shouldFetch) {
    return null;
  }

  const symbols =
    inferredSymbols.length > 0 ? inferredSymbols : [...DEFAULT_MARKET_SYMBOLS];

  // v8 is slightly more stable than v7 for unauthenticated access
  const endpoint = `https://query2.finance.yahoo.com/v8/finance/spark?symbols=${encodeURIComponent(
    symbols.join(",")
  )}&range=1d&interval=1d`;

  // Fallback to the v7 quote endpoint which has richer data when v8 returns nothing
  const v7Endpoint = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(
    symbols.join(",")
  )}&fields=symbol,shortName,longName,regularMarketPrice,regularMarketChangePercent,currency,marketState`;

  let response: Response;
  try {
    // AbortSignal with 4s timeout to avoid blocking the LLM call too long
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    try {
      response = await fetch(v7Endpoint, {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
        headers: {
          // Mimic a browser to reduce Yahoo bot-blocking
          "User-Agent":
            "Mozilla/5.0 (compatible; KORA-finance-agent/1.0)",
          Accept: "application/json, */*",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    return createUnavailableSnapshot(normalizedQuery, symbols);
  }

  if (!response.ok) {
    let errorBody = "";
    try {
      errorBody = await response.text();
    } catch {
      errorBody = "";
    }

    const reason = isYahooBlockedResponse(response.status, errorBody)
      ? "blocked"
      : "unavailable";
    return createUnavailableSnapshot(normalizedQuery, symbols, reason);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return createUnavailableSnapshot(normalizedQuery, symbols);
  }

  const quotes = parseQuotes(payload);

  const summary =
    quotes.length === 0
      ? "No live quote data returned."
      : `Live market snapshot: ${quotes
          .map((quote) => formatQuoteLine(quote))
          .join(" | ")}`;

  return {
    query: titleCase(normalizedQuery),
    fetchedAt: new Date().toISOString(),
    symbols,
    quotes,
    summary,
  };
}
