import type { FastifyInstance } from "fastify";
import { err } from "@/shared/errors";
import type { TokenServicePort } from "@/identity/application/ports/token-service.port";
import "@/identity/interfaces/http/auth-context";
import fp from "fastify-plugin";

export const registerAuthMiddleware = fp(
  async (app: FastifyInstance, opts: { tokens: TokenServicePort }) => {
    app.addHook("onRequest", async (req) => {
      req.auth = { kind: "anonymous" };

      const header = req.headers.authorization;
      if (!header) return;

      const [scheme, token] = header.split(" ");
      if (scheme !== "Bearer" || !token) return;

      try {
        const verified = await opts.tokens.verifyAccessToken(token);
        req.auth = {
          kind: "user",
          userId: verified.userId,
          sessionId: verified.sessionId,
          role: verified.role,
        };
      } catch {
        req.auth = { kind: "anonymous" };
      }
    });
  },
);

export function requireAuth(auth: unknown): asserts auth is {
  kind: "user";
  userId: string;
  sessionId: string;
  role: "user" | "admin";
} {
  if (
    typeof auth !== "object" ||
    auth === null ||
    (auth as any).kind !== "user" ||
    typeof (auth as any).userId !== "string" ||
    typeof (auth as any).sessionId !== "string" ||
    ((auth as any).role !== "user" && (auth as any).role !== "admin")
  ) {
    throw err("UNAUTHORIZED");
  }
}

export function requireAdmin(auth: unknown): asserts auth is {
  kind: "user";
  userId: string;
  sessionId: string;
  role: "admin";
} {
  requireAuth(auth);
  if (auth.role !== "admin") {
    throw err("FORBIDDEN");
  }
}
