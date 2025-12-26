import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  registerSchema,
  loginSchema,
  providerAuthSchema,
  refreshSchema,
} from "./schemas";
import type { RegisterWithPasswordDeps } from "@/identity/application/use-cases/register-with-password";
import { registerWithPassword } from "@/identity/application/use-cases/register-with-password";
import type { LoginWithPasswordDeps } from "@/identity/application/use-cases/login-with-password";
import { loginWithPassword } from "@/identity/application/use-cases/login-with-password";
import type { AuthenticateWithProviderDeps } from "@/identity/application/use-cases/authenticate-with-provider";
import { authenticateWithProvider } from "@/identity/application/use-cases/authenticate-with-provider";
import { refreshSession } from "@/identity/application/use-cases/refresh-session";
import type { SessionRepositoryPort } from "@/identity/application/ports/session-repository.port";
import type { TokenServicePort } from "@/identity/application/ports/token-service.port";
import { err } from "@/shared/errors";
import type { AuditLogRepositoryPort } from "@/audit/application/ports/audit-log-repository.port";
import {
  actorFromAuth,
  ipHashOf,
  userAgentOf,
} from "@/audit/interfaces/http/helpers";

export type IdentityHttpDeps = {
  registerDeps: RegisterWithPasswordDeps;
  loginDeps: LoginWithPasswordDeps;
  providerDeps: AuthenticateWithProviderDeps;
  refreshDeps: { sessions: SessionRepositoryPort; tokens: TokenServicePort };
  audit: AuditLogRepositoryPort;
};

// Tiny helper to convert Zod failures into thrown errors the middleware handles.
function parseOrThrow<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    // Throw ZodError so the global handler returns VALIDATION_ERROR with details
    throw err("VALIDATION_ERROR", {
      cause: parsed.error.cause,
      message: parsed.error.name,
    });
  }
  return parsed.data;
}

export async function registerIdentityRoutes(
  app: FastifyInstance,
  deps: IdentityHttpDeps,
): Promise<void> {
  app.post("/auth/register", async (req, reply) => {
    const body = parseOrThrow(registerSchema, req.body);
    const result = await registerWithPassword(deps.registerDeps, body);

    await deps.audit.create({
      actorType: "user",
      actorUserId: result.userId,
      actorApiKeyId: null,
      action: "identity.register",
      resourceType: "user",
      resourceId: result.userId,
      ipHash: ipHashOf(req),
      userAgent: userAgentOf(req),
      metadata: { email: body.email },
    });

    return reply.status(201).send(result);
  });

  app.post("/auth/login", async (req, reply) => {
    const body = parseOrThrow(loginSchema, req.body);
    const result = await loginWithPassword(deps.loginDeps, body);

    await deps.audit.create({
      actorType: "user",
      actorUserId: result.userId,
      actorApiKeyId: null,
      action: "identity.login",
      resourceType: "session",
      resourceId: null,
      ipHash: ipHashOf(req),
      userAgent: userAgentOf(req),
      metadata: {},
    });
    return reply.status(200).send(result);
  });

  app.post("/auth/provider", async (req, reply) => {
    const body = parseOrThrow(providerAuthSchema, req.body);

    // Defense-in-depth: enforce provider allowlist at HTTP boundary too
    if (!["local", "google", "auth0", "oidc"].includes(body.provider)) {
      throw err("IDENTITY_PROVIDER_NOT_SUPPORTED");
    }

    const result = await authenticateWithProvider(deps.providerDeps, body);
    return reply.status(200).send(result);
  });

  app.post("/auth/refresh", async (req, reply) => {
    const body = parseOrThrow(refreshSchema, req.body);
    const result = await refreshSession(deps.refreshDeps, body);
    return reply.status(200).send(result);
  });
}
