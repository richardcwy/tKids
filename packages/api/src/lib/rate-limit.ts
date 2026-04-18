import { db } from "@my-better-t-app/db";
import { rateLimits } from "@my-better-t-app/db/schema";
import { and, eq, sql as dsql, lt } from "drizzle-orm";

// Rolling window rate limit per IP hash.
// Window is a fixed 60s bucket: floor(now / window) * window.
// Upsert-increment on composite PK (ip_hash, window_start).
export async function checkRateLimit(
  ipHash: string,
  max = 5,
  windowMs = 60_000,
): Promise<{
  allowed: boolean;
  count: number;
  retryAfterSeconds: number;
}> {
  const now = Date.now();
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const windowDate = new Date(windowStart);

  await db
    .insert(rateLimits)
    .values({ ipHash, windowStart: windowDate, count: 1 })
    .onConflictDoUpdate({
      target: [rateLimits.ipHash, rateLimits.windowStart],
      set: {
        count: dsql`${rateLimits.count} + 1`,
        updatedAt: new Date(now),
      },
    });

  const [row] = await db
    .select({ count: rateLimits.count })
    .from(rateLimits)
    .where(
      and(
        eq(rateLimits.ipHash, ipHash),
        eq(rateLimits.windowStart, windowDate),
      ),
    )
    .limit(1);

  const count = row?.count ?? 0;
  return {
    allowed: count <= max,
    count,
    retryAfterSeconds: Math.ceil((windowStart + windowMs - now) / 1000),
  };
}

// Housekeeping: wipe buckets older than 1 hour. Call from a scheduled
// Worker cron.
export async function cleanupRateLimits(maxAgeMs = 60 * 60 * 1000) {
  const cutoff = new Date(Date.now() - maxAgeMs);
  await db.delete(rateLimits).where(lt(rateLimits.windowStart, cutoff));
}
