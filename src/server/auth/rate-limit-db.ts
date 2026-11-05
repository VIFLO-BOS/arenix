import "server-only";
import { connectDb } from "@/server/db/connect";
import { RateLimit } from "@/server/db/models/user";

/**
 * Fixed window rate limit stored in MongoDB. Unlike the in memory limiter in src/lib, the
 * count is shared by every server instance, which matters on Vercel where each request can
 * land on a different instance. Used for sign in, codes and password resets.
 */
export async function rateLimitDb(key: string, limit: number, windowMs: number): Promise<{ ok: boolean; retryAfterMs: number }> {
  await connectDb();
  const now = new Date();

  // Count against the current window if it is still open.
  const open = await RateLimit.findOneAndUpdate({ key, resetAt: { $gt: now } }, { $inc: { count: 1 } }, { new: true }).lean();
  if (open) return { ok: open.count <= limit, retryAfterMs: open.resetAt.getTime() - now.getTime() };

  // Otherwise start a new window. A parallel request may have started it first, in which
  // case the unique key makes this a plain update.
  const resetAt = new Date(now.getTime() + windowMs);
  try {
    await RateLimit.updateOne({ key }, { $set: { count: 1, resetAt } }, { upsert: true });
  } catch {
    await RateLimit.updateOne({ key }, { $inc: { count: 1 } });
  }
  return { ok: 1 <= limit, retryAfterMs: windowMs };
}
