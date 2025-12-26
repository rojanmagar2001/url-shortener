import type { FastifyInstance } from "fastify";
import { err } from "@/shared/errors";
import type { TokenServicePort } from "@/identity/application/ports/token-service.port";
import "@/identity/interfaces/http/auth-context";
import type { ApiKeyRepositoryPort } from "@/access/application/ports/api-key-repository.port";
import { sha256Hex, safeEqual } from "@/shared/crypto/hashing";
import fp from "fastify-plugin";

export const registerAuthMiddleware = fp(
  async (
    app: FastifyInstance,
    opts: { tokens: TokenServicePort; apiKeys: ApiKeyRepositoryPort },
  ): Promise<void> => {
    app.addHook("onRequest", async (req) => {
      req.auth = { kind: "anonymous" };

      const header = req.headers.authorization;
      if (!header) return;

      // 1) Bearer JWT
      {
        const [scheme, token] = header.split(" ");
        if (scheme === "Bearer" && token) {
          try {
            const verified = await opts.tokens.verifyAccessToken(token);
            req.auth = {
              kind: "user",
              userId: verified.userId,
              sessionId: verified.sessionId,
              role: verified.role,
            };
            return;
          } catch {
            // continue to ApiKey attempt
          }
        }
      }

      // 2) ApiKey <prefix>.<secret>
      {
        const [scheme, value] = header.split(" ");
        if (scheme !== "ApiKey" || !value) return;

        const parts = value.split(".");
        if (parts.length !== 2) return;

        const [prefix, secret] = parts;
        if (!prefix || !secret) return;

        const record = await opts.apiKeys.findByPrefix(prefix);
        if (!record) return;
        if (record.revokedAt) return;
        if (record.expiresAt && record.expiresAt.getTime() <= Date.now())
          return;

        const presentedHash = sha256Hex(secret);
        if (!safeEqual(presentedHash, record.keyHash)) return;

        // Mark as used (best-effort)
        void opts.apiKeys
          .touchLastUsed(record.id, new Date())
          .catch(() => undefined);

        req.auth = {
          kind: "api_key",
          apiKeyId: record.id,
          userId: record.userId,
          scopes: record.scopes,
        };
      }
    });
  },
);

export function requireAuth(
  auth: unknown,
): asserts auth is
  | { kind: "user"; userId: string; sessionId: string; role: "user" | "admin" }
  | { kind: "api_key"; apiKeyId: string; userId: string; scopes: string[] } {
  if (typeof auth !== "object" || auth === null) throw err("UNAUTHORIZED");
  const kind = (auth as any).kind;
  if (kind !== "user" && kind !== "api_key") throw err("UNAUTHORIZED");
}

export function requireAdmin(auth: unknown): asserts auth is {
  kind: "user";
  userId: string;
  sessionId: string;
  role: "admin";
} {
  if (typeof auth !== "object" || auth === null) throw err("UNAUTHORIZED");
  if ((auth as any).kind !== "user") throw err("UNAUTHORIZED");
  if ((auth as any).role !== "admin") throw err("FORBIDDEN");
}

export function requireScope(auth: unknown, scope: string): void {
  requireAuth(auth);
  if (auth.kind === "user") {
    // User auth doesn't use scopes; handled via RBAC/ownership.
    return;
  }
  if (!auth.scopes.includes(scope)) {
    throw err("FORBIDDEN");
  }
}
