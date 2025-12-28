import type { LinkRepositoryPort } from "@/links/application/ports/link-repository.port";
import type { AppRedis } from "@/shared/redis/client";

export type CachedLink = {
  linkId: string;
  originalUrl: string;
  expiresAt: string | null;
  isActive: boolean;
};

function cacheKey(code: string): string {
  return `link:code:${code}`;
}

export async function resolveLink(
  deps: { links: LinkRepositoryPort; redis: AppRedis },
  input: { code: string },
): Promise<{
  code: string;
  originalUrl: string;
  expiresAt: Date | null;
  isActive: boolean;
} | null> {
  const key = cacheKey(input.code);

  // 1) cache
  const cachedRaw = await deps.redis.get(key);
  if (cachedRaw) {
    const parsed = JSON.parse(cachedRaw) as CachedLink;
    return {
      code: input.code,
      originalUrl: parsed.originalUrl,
      expiresAt: parsed.expiresAt ? new Date(parsed.expiresAt) : null,
      isActive: parsed.isActive,
    };
  }

  // 2) db
  const link = await deps.links.findByCode(input.code);
  if (!link) return null;

  const payload: CachedLink = {
    linkId: link.id,
    originalUrl: link.originalUrl,
    expiresAt: link.expiresAt ? link.expiresAt.toISOString() : null,
    isActive: link.isActive,
  };

  // TTL: expire at link expiry if provided; otherwise 5 minutes
  const ttlSeconds = link.expiresAt
    ? Math.max(1, Math.floor((link.expiresAt.getTime() - Date.now()) / 1000))
    : 300;

  await deps.redis.set(key, JSON.stringify(payload), { EX: ttlSeconds });

  return {
    code: link.code,
    originalUrl: link.originalUrl,
    expiresAt: link.expiresAt,
    isActive: link.isActive,
  };
}
