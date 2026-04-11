type RateLimitOperation = "checkin" | "synthesize" | "agents" | "transcribe";

const DEFAULT_LIMITS: Record<RateLimitOperation, number> = {
  checkin: 20,
  synthesize: 30,
  agents: 60,
  transcribe: 20,
};

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

interface RateLimitEntry {
  count: number;
  expiresAt: number;
}

const WINDOW_MS = 60_000;
const entryStore = new Map<string, RateLimitEntry>();
let requestsSinceCleanup = 0;

function cleanupExpiredEntries(now: number): void {
  for (const [key, entry] of entryStore) {
    if (entry.expiresAt <= now) {
      entryStore.delete(key);
    }
  }
}

export async function rateLimit(
  userId: string,
  operation: RateLimitOperation,
  maxPerMinute: number = DEFAULT_LIMITS[operation]
): Promise<RateLimitResult> {
  const now = Date.now();
  const bucket = Math.floor(now / WINDOW_MS);
  const key = `rate:${operation}:${userId}:${bucket}`;

  const existing = entryStore.get(key);
  const entry =
    existing && existing.expiresAt > now
      ? existing
      : { count: 0, expiresAt: now + WINDOW_MS };

  entry.count += 1;
  entryStore.set(key, entry);

  requestsSinceCleanup += 1;
  if (requestsSinceCleanup >= 100) {
    cleanupExpiredEntries(now);
    requestsSinceCleanup = 0;
  }

  return {
    allowed: entry.count <= maxPerMinute,
    remaining: Math.max(0, maxPerMinute - entry.count),
  };
}
