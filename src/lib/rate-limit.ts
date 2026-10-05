import "server-only";
import { prisma } from "@/lib/db/prisma";

export type RateLimitScope = "staff-login" | "portal-login" | "password-reset-request";

const LIMITS: Record<RateLimitScope, { max: number; windowMs: number }> = {
  "staff-login": { max: 10, windowMs: 15 * 60_000 },
  "portal-login": { max: 10, windowMs: 15 * 60_000 },
  "password-reset-request": { max: 5, windowMs: 15 * 60_000 },
};

export class RateLimitExceededError extends Error {
  constructor() {
    super("Too many attempts. Try again in a few minutes.");
  }
}

/**
 * Fixed-window attempt counter backed by RateLimitBucket. The upsert is a single
 * statement so concurrent requests for the same key can't race past the cap.
 */
export async function enforceRateLimit(scope: RateLimitScope, identifier: string): Promise<void> {
  const { max, windowMs } = LIMITS[scope];
  const key = `${scope}:${identifier.trim().toLowerCase()}`;

  const rows = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO rate_limit_buckets (key, count, "windowStart")
    VALUES (${key}, 1, now())
    ON CONFLICT (key) DO UPDATE SET
      count = CASE
        WHEN rate_limit_buckets."windowStart" < now() - (${windowMs}::text || ' milliseconds')::interval
        THEN 1
        ELSE rate_limit_buckets.count + 1
      END,
      "windowStart" = CASE
        WHEN rate_limit_buckets."windowStart" < now() - (${windowMs}::text || ' milliseconds')::interval
        THEN now()
        ELSE rate_limit_buckets."windowStart"
      END
    RETURNING count
  `;

  if ((rows[0]?.count ?? 0) > max) {
    throw new RateLimitExceededError();
  }
}
