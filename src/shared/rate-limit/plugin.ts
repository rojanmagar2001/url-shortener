import type { FastifyInstance } from "fastify";
import type { AppRedis } from "@/shared/redis/client";
import { fixedWindowLimit } from "./limiter";
import { err } from "@/shared/errors/index";
import "@/identity/interfaces/http/auth-context";
import { ipHashOf } from "@/audit/interfaces/http/helpers";

export type RateLimitConfig = {
  redirect: { limit: number; windowSeconds: number };
  api: { limit: number; windowSeconds: number };
};

export async function registerRateLimitPlugin(
  app: FastifyInstance,
  opts: { redis: AppRedis; config: RateLimitConfig },
): Promise<void> {
  app.addHook("onRequest", async (req, reply) => {
    const url = req.url;

    // Skip health + root
    if (url === "/health" || url === "/" || url.startsWith("/metrics")) return;

    // Redirect path heuristic: "/<code>" (no slash besides leading)
    const isRedirect =
      !url.startsWith("/api/") &&
      !url.startsWith("/auth/") &&
      !url.startsWith("/admin/") &&
      !url.startsWith("/settings/");

    if (isRedirect) {
      const ipHash = ipHashOf(req) ?? "unknown";
      const r = await fixedWindowLimit(opts.redis, {
        key: `rl:redirect:ip:${ipHash}`,
        limit: opts.config.redirect.limit,
        windowSeconds: opts.config.redirect.windowSeconds,
      });

      reply.header("x-ratelimit-limit", String(opts.config.redirect.limit));
      reply.header("x-ratelimit-remaining", String(r.remaining));
      reply.header("x-ratelimit-reset", String(r.resetSeconds));

      if (!r.allowed) throw err("RATE_LIMITED");
      return;
    }

    // API routes: apply per-user or per-api-key if authenticated; otherwise per-ip
    if (url.startsWith("/api/") || url.startsWith("/settings/")) {
      const auth = (req as any).auth;

      let key: string;
      if (auth?.kind === "api_key") {
        key = `rl:api:key:${auth.apiKeyId}`;
      } else if (auth?.kind === "user") {
        key = `rl:api:user:${auth.userId}`;
      } else {
        const ipHash = ipHashOf(req) ?? "unknown";
        key = `rl:api:ip:${ipHash}`;
      }

      const r = await fixedWindowLimit(opts.redis, {
        key,
        limit: opts.config.api.limit,
        windowSeconds: opts.config.api.windowSeconds,
      });

      reply.header("x-ratelimit-limit", String(opts.config.api.limit));
      reply.header("x-ratelimit-remaining", String(r.remaining));
      reply.header("x-ratelimit-reset", String(r.resetSeconds));

      if (!r.allowed) throw err("RATE_LIMITED");
    }
  });
}
