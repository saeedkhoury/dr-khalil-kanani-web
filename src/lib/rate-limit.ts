/**
 * Rate limiting for the public form endpoint.
 *
 * Uses a Cloudflare KV namespace when bound, and falls back to an in-memory
 * map otherwise. The in-memory path is correct for local development and
 * single-instance preview only — it is NOT a durable limit across workers,
 * so `isDurable()` reports which mode is active and deployment must bind KV.
 */

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_PER_WINDOW = 5;

const memory = new Map<string, number[]>();

export function isDurable(): boolean {
  return Boolean((globalThis as Record<string, unknown>).RATE_LIMIT_KV);
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

export async function checkRateLimit(key: string): Promise<RateLimitResult> {
  const now = Date.now();
  const kv = (globalThis as Record<string, unknown>).RATE_LIMIT_KV as
    | { get(k: string): Promise<string | null>; put(k: string, v: string, o?: unknown): Promise<void> }
    | undefined;

  if (kv) {
    const stored = await kv.get(`rl:${key}`);
    const hits: number[] = stored ? (JSON.parse(stored) as number[]) : [];
    const recent = hits.filter((t) => now - t < WINDOW_MS);
    if (recent.length >= MAX_PER_WINDOW) return { allowed: false, remaining: 0 };
    recent.push(now);
    await kv.put(`rl:${key}`, JSON.stringify(recent), { expirationTtl: WINDOW_MS / 1000 });
    return { allowed: true, remaining: MAX_PER_WINDOW - recent.length };
  }

  const hits = (memory.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (hits.length >= MAX_PER_WINDOW) return { allowed: false, remaining: 0 };
  hits.push(now);
  memory.set(key, hits);
  return { allowed: true, remaining: MAX_PER_WINDOW - hits.length };
}
