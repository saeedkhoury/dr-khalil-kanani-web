/**
 * Rate limiting for the public form endpoint.
 *
 * ── PREVIOUS BUG (fixed) ──────────────────────────────────────────────────
 * This module used to look for `globalThis.RATE_LIMIT_KV`. That binding is
 * never on globalThis in Cloudflare Workers, so the KV branch NEVER ran in
 * production and every request silently fell through to a per-isolate
 * in-memory map — i.e. the rate limit looked implemented but did not exist.
 *
 * Bindings now resolve through src/lib/env.ts, and the degraded state is
 * reported rather than hidden.
 *
 * ── FAIL-OPEN, DELIBERATELY ───────────────────────────────────────────────
 * If KV is unreachable this allows the request through. For a dental clinic's
 * only contact channel, failing closed would block real patients — a worse
 * outcome than letting spam through, which validation and the spam flag still
 * catch. The degradation is logged loudly so it cannot pass unnoticed.
 */

import { getBinding } from './env';

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_PER_WINDOW = 5;

/** Bounded so a long-lived isolate cannot grow this map without limit. */
const MEMORY_MAX_KEYS = 5_000;
const memory = new Map<string, number[]>();

interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** False when KV was unavailable and the in-memory fallback was used. */
  durable: boolean;
}

function pruneMemory(now: number): void {
  for (const [key, hits] of memory) {
    const recent = hits.filter((t) => now - t < WINDOW_MS);
    if (recent.length === 0) memory.delete(key);
    else memory.set(key, recent);
  }
  // Hard ceiling: if still oversized, drop the oldest-inserted keys.
  if (memory.size > MEMORY_MAX_KEYS) {
    const excess = memory.size - MEMORY_MAX_KEYS;
    let dropped = 0;
    for (const key of memory.keys()) {
      memory.delete(key);
      if (++dropped >= excess) break;
    }
  }
}

function checkInMemory(key: string, now: number): RateLimitResult {
  pruneMemory(now);
  const hits = (memory.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (hits.length >= MAX_PER_WINDOW) return { allowed: false, remaining: 0, durable: false };
  hits.push(now);
  memory.set(key, hits);
  return { allowed: true, remaining: MAX_PER_WINDOW - hits.length, durable: false };
}

export async function checkRateLimit(key: string): Promise<RateLimitResult> {
  const now = Date.now();
  const kv = await getBinding<KVNamespace>('RATE_LIMIT_KV');

  if (!kv) {
    console.warn(
      '[rate-limit] RATE_LIMIT_KV is not bound; using the in-memory fallback. ' +
        'This is per-isolate and is NOT a durable limit. Bind the KV namespace before production.',
    );
    return checkInMemory(key, now);
  }

  try {
    const stored = await kv.get(`rl:${key}`);
    const hits: number[] = stored ? (JSON.parse(stored) as number[]) : [];
    const recent = hits.filter((t) => now - t < WINDOW_MS);

    if (recent.length >= MAX_PER_WINDOW) return { allowed: false, remaining: 0, durable: true };

    recent.push(now);
    await kv.put(`rl:${key}`, JSON.stringify(recent), { expirationTtl: WINDOW_MS / 1000 });
    return { allowed: true, remaining: MAX_PER_WINDOW - recent.length, durable: true };
  } catch (error) {
    // Fail open rather than block a patient, but never silently.
    console.error('[rate-limit] KV read/write failed; falling back to in-memory', error);
    return checkInMemory(key, now);
  }
}
