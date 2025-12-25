import Fastify, { type FastifyInstance } from "fastify";
import { registerHealthRoutes } from "@/shared/http/routes/health";
import { registerErrorHandler } from "@/shared/http/error-handler";
import { config } from "@/shared/config";
import { createPrismaClient } from "@/shared/db/prisma";

import { PrismaUserRepository } from "@/identity/infrastructure/persistence/prisma-user-repository";
import { PrismaExternalIdentityRepository } from "@/identity/infrastructure/persistence/prisma-external-identity-repository";
import { PrismaSessionRepository } from "@/identity/infrastructure/persistence/prisma-session-repository";
import { BcryptPasswordHasher } from "@/identity/infrastructure/password/bcrypt-password-hasher";
import { registerIdentityRoutes } from "@/identity/interfaces/http/routes";
import { LocalPasswordAuthProvider } from "@/identity/infrastructure/providers/local-password-auth-provider";
import type { AuthProviderPort } from "@/identity/application/ports/auth-provider.port";
import { JwtTokenService } from "@/identity/infrastructure/crypto/jwt-token-service";
import { registerAuthMiddleware } from "@/identity/interfaces/http/middleware";
import { registerMeRoutes } from "@/identity/interfaces/http/me-routes";
import { registerAdminRoutes } from "@/admin/interfaces/http/routes";

export type CreateAppOptions = {
  logger?: boolean;
  databaseUrl?: string; // for tests
};

export function createApp(options: CreateAppOptions = {}): FastifyInstance {
  const app = Fastify({
    logger: options.logger ?? true,
  });

  void app.register(registerErrorHandler);
  void app.register(registerHealthRoutes);

  const prisma = createPrismaClient(options.databaseUrl ?? config.database.url);

  app.addHook("onClose", async () => {
    await prisma.$disconnect();
  });

  const usersRepo = new PrismaUserRepository(prisma);
  const externalIdentitiesRepo = new PrismaExternalIdentityRepository(prisma);
  const sessionsRepo = new PrismaSessionRepository(prisma);
  const passwordHasher = new BcryptPasswordHasher(12);

  const tokens = new JwtTokenService(config.jwt, sessionsRepo, usersRepo);

  const providers = new Map<string, AuthProviderPort>();
  providers.set(
    "local",
    new LocalPasswordAuthProvider(usersRepo, passwordHasher),
  );

  // Attach req.auth for all requests
  app.register(registerAuthMiddleware, { tokens });

  app.register(async (instance) => {
    await registerIdentityRoutes(instance, {
      registerDeps: { users: usersRepo, passwordHasher, tokens },
      loginDeps: { users: usersRepo, passwordHasher, tokens },
      providerDeps: {
        providers,
        externalIdentities: externalIdentitiesRepo,
        users: usersRepo,
        tokens,
      },
      refreshDeps: { sessions: sessionsRepo, tokens },
    });
  });

  app.register(registerAdminRoutes);

  app.register(registerMeRoutes);

  app.get("/", async () => ({ service: "url-shortener" as const }));

  return app;
}
