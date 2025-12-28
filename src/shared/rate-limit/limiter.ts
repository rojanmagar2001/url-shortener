import type { AppRedis } from "@/shared/redis/client";

export type RateLimitResult =
  | { allowed: true; remaining: number; resetSeconds: number }
  | { allowed: false; remaining: 0; resetSeconds: number };

export type FixedWindowConfig = {
  limit: number;
  windowSeconds: number;
  key: string;
};

function windowStart(nowMs: number, windowSeconds: number): number {
  const nowSec = Math.floor(nowMs / 1000);
  return nowSec - (nowSec % windowSeconds);
}

export async function fixedWindowLimit(
  redis: AppRedis,
  cfg: FixedWindowConfig,
): Promise<RateLimitResult> {
  const now = Date.now();
  const start = windowStart(now, cfg.windowSeconds);
  const key = `${cfg.key}:${start}`;

  // INCR returns new value
  const count = await redis.incr(key);

  // Ensure expiry is set (best-effort; if called concurrently, it's OK)
  if (count === 1) {
    await redis.expire(key, cfg.windowSeconds);
  }

  const resetSeconds = start + cfg.windowSeconds - Math.floor(now / 1000);
  if (count > cfg.limit) {
    return { allowed: false, remaining: 0, resetSeconds };
  }

  return {
    allowed: true,
    remaining: Math.max(0, cfg.limit - count),
    resetSeconds,
  };
}
