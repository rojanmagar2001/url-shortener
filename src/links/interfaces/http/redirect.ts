import type { FastifyInstance } from "fastify";
import { err } from "@/shared/errors/index";
import type { LinkRepositoryPort } from "@/links/application/ports/link-repository.port";
import type { AppRedis } from "@/shared/redis/client";
import { resolveLink } from "@/links/application/use-cases/resolve-link";

// Basic “internal target” denylist for IP literals and common local hostnames.
// This is NOT full SSRF defense (no DNS resolution). It prevents obvious abuse.
function isUnsafeRedirectTarget(urlStr: string): boolean {
  let url: URL;
  try {
    url = new URL(urlStr);
  } catch {
    return true;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return true;

  const host = url.hostname.toLowerCase();

  // Block common local hostnames
  if (host === "localhost" || host.endsWith(".localhost")) return true;

  // IPv4 literal checks
  const ipv4 = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    // 127.0.0.0/8 loopback
    if (a === 127) return true;
    // 10.0.0.0/8 private
    if (a === 10) return true;
    // 172.16.0.0/12 private
    if (a === 172 && b >= 16 && b <= 31) return true;
    // 192.168.0.0/16 private
    if (a === 192 && b === 168) return true;
    // 169.254.0.0/16 link-local
    if (a === 169 && b === 254) return true;
    // 0.0.0.0/8 “this network”
    if (a === 0) return true;
  }

  // IPv6 literal (very lightweight): block loopback and link-local
  if (host === "::1" || host.startsWith("fe80:") || host === "::") return true;

  // Block credentials in URL (phishing-ish; also weird edge cases)
  if (url.username || url.password) return true;

  return false;
}

export async function registerRedirectRoutes(
  app: FastifyInstance,
  deps: { links: LinkRepositoryPort; redis: AppRedis },
): Promise<void> {
  app.get("/:code", async (req, reply) => {
    const code = (req.params as any).code as string;

    // Avoid catching other routes like /api/*, /auth/*, /admin/*
    // This is a guardrail; route ordering also matters.
    if (
      code === "api" ||
      code === "auth" ||
      code === "admin" ||
      code === "settings"
    ) {
      throw err("NOT_FOUND");
    }

    const found = await resolveLink(
      { links: deps.links, redis: deps.redis },
      { code },
    );
    if (!found) throw err("NOT_FOUND");

    if (!found.isActive) throw err("LINK_INACTIVE");
    if (found.expiresAt && found.expiresAt.getTime() <= Date.now())
      throw err("LINK_EXPIRED");

    if (isUnsafeRedirectTarget(found.originalUrl)) {
      throw err("LINK_UNSAFE_REDIRECT");
    }

    return reply.redirect(found.originalUrl);
  });
}
