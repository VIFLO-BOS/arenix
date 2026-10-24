/**
 * In-memory fixed-window rate limiter. Per server instance only: good enough for a single
 * Node/Vercel instance and for defending forms against casual abuse. For multi-instance
 * deployments swap the store for Redis/Upstash behind the same signature.
 */
type Bucket = { count: number; resetAt: number };

declare global {
  var __arenixRateBuckets: Map<string, Bucket> | undefined;
}

const buckets = global.__arenixRateBuckets ?? (global.__arenixRateBuckets = new Map());

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 5000) {
      for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
    }
    return { ok: true, remaining: limit - 1, resetAt: now + windowMs };
  }
  existing.count += 1;
  return { ok: existing.count <= limit, remaining: Math.max(0, limit - existing.count), resetAt: existing.resetAt };
}
