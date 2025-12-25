import type { FastifyInstance } from "fastify";
import { err } from "@/shared/errors";
import type { TokenServicePort } from "@/identity/application/ports/token-service.port";
import "@/identity/interfaces/http/auth-context";

export async function registerAuthMiddleware(
  app: FastifyInstance,
  deps: { tokens: TokenServicePort },
): Promise<void> {
  app.addHook("onRequest", async (req) => {
    req.auth = { kind: "anonymous" };

    const header = req.headers.authorization;
    if (!header) return;

    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer" || !token) return;

    const verified = await deps.tokens.verifyAccessToken(token);
    req.auth = {
      kind: "user",
      userId: verified.userId,
      sessionId: verified.sessionId,
    };
  });
}

export function requireAuth(auth: {
  kind: string;
}): asserts auth is { kind: "user"; userId: string; sessionId: string } {
  if (auth.kind !== "user") {
    throw err("IDENTITY_INVALID_CREDENTIALS", { message: "Unauthorized" });
  }
}
