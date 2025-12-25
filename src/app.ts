import Fastify, { type FastifyInstance } from "fastify";
import { registerHealthRoutes } from "@/shared/http/routes/health";
import { config } from "@/shared/config";
import { createPrismaClient } from "@/shared/db/prisma";

import { PrismaUserRepository } from "@/identity/infrastructure/persistence/prisma-user-repository";
import { BcryptPasswordHasher } from "@/identity/infrastructure/password/bcrypt-password-hasher";
import type {
  TokenPair,
  TokenServicePort,
} from "@/identity/application/ports/token-service.port";
import { registerIdentityRoutes } from "@/identity/interfaces/http/routes";

export type CreateAppOptions = {
  logger?: boolean;
  databaseUrl?: string; // for tests
};

class DevTokenService implements TokenServicePort {
  async issueForUser(userId: string): Promise<TokenPair> {
    // Placeholder only. Step 5/6 will implement JWT + refresh rotation + sessions.
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

  void app.register(registerHealthRoutes);

  const prisma = createPrismaClient(options.databaseUrl ?? config.database.url);

  // NOTE: In later steps we’ll manage lifecycle + graceful close hooks.
  app.addHook("onClose", async () => {
    await prisma.$disconnect();
  });

  const usersRepo = new PrismaUserRepository(prisma);
  const passwordHasher = new BcryptPasswordHasher(12);
  const tokens = new DevTokenService();

  void app.register(async (instance) => {
    await registerIdentityRoutes(instance, {
      registerDeps: { users: usersRepo, passwordHasher, tokens },
      loginDeps: { users: usersRepo, passwordHasher, tokens },
    });
  });

  app.get("/", async () => ({ service: "url-shortener" as const }));

  return app;
}
