import Fastify, { type FastifyInstance } from "fastify";
import { registerHealthRoutes } from "@/shared/http/routes/health";
import { registerErrorHandler } from "@/shared/http/error-handler";
import { config } from "@/shared/config";
import { createPrismaClient } from "@/shared/db/prisma";

import { PrismaUserRepository } from "@/identity/infrastructure/persistence/prisma-user-repository";
import { PrismaExternalIdentityRepository } from "@/identity/infrastructure/persistence/prisma-external-identity-repository";
import { BcryptPasswordHasher } from "@/identity/infrastructure/password/bcrypt-password-hasher";
import type {
  TokenPair,
  TokenServicePort,
} from "@/identity/application/ports/token-service.port";
import { registerIdentityRoutes } from "@/identity/interfaces/http/routes";
import { LocalPasswordAuthProvider } from "@/identity/infrastructure/providers/local-password-auth-provider";
import type { AuthProviderPort } from "@/identity/application/ports/auth-provider.port";

export type CreateAppOptions = {
  logger?: boolean;
  databaseUrl?: string; // for tests
};

class DevTokenService implements TokenServicePort {
  async issueForUser(userId: string): Promise<TokenPair> {
    return {
      accessToken: `dev-access-${userId}`,
      refreshToken: `dev-refresh-${userId}`,
    };
  }
}

export function createApp(options: CreateAppOptions = {}): FastifyInstance {
  const app = Fastify({
    logger: options.logger ?? true,
  });

  // Register global error handling first so it applies everywhere
  void app.register(registerErrorHandler);

  void app.register(registerHealthRoutes);

  const prisma = createPrismaClient(options.databaseUrl ?? config.database.url);

  app.addHook("onClose", async () => {
    await prisma.$disconnect();
  });

  const usersRepo = new PrismaUserRepository(prisma);
  const externalIdentitiesRepo = new PrismaExternalIdentityRepository(prisma);
  const passwordHasher = new BcryptPasswordHasher(12);
  const tokens = new DevTokenService();

  const providers = new Map<string, AuthProviderPort>();
  providers.set(
    "local",
    new LocalPasswordAuthProvider(usersRepo, passwordHasher),
  );

  void app.register(async (instance) => {
    await registerIdentityRoutes(instance, {
      registerDeps: { users: usersRepo, passwordHasher, tokens },
      loginDeps: { users: usersRepo, passwordHasher, tokens },
      providerDeps: {
        providers,
        externalIdentities: externalIdentitiesRepo,
        users: usersRepo,
        tokens,
      },
    });
  });

  app.get("/", async () => ({ service: "url-shortener" as const }));

  return app;
}
