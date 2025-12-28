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
import { PrismaApiKeyRepository } from "@/access/infrastructure/persistence/prisma-api-key-repository";
import { registerApiKeyRoutes } from "@/access/interfaces/http/routes";
import { PrismaAuditLogRepository } from "@/audit/infrastructure/persistence/prisma-audit-log-repository";
import { PrismaLinkRepository } from "@/links/infrastructure/persistence/prisma-link-repository";
import { registerLinkRoutes } from "@/links/interfaces/http/routes";

import { createRedisClient } from "@/shared/redis/client";
import { registerRedirectRoutes } from "@/links/interfaces/http/redirect";

import { registerRateLimitPlugin } from "@/shared/rate-limit/plugin";

import {
  KafkaJsProducer,
  NoopProducer,
  type EventProducer,
} from "@/shared/kafka/producer";
import { TOPICS } from "@/shared/kafka/topics";

export type CreateAppOptions = {
  logger?: boolean;
  databaseUrl?: string; // for tests
  rateLimit?: {
    redirect: { limit: number; windowSeconds: number };
    api: { limit: number; windowSeconds: number };
  };
  kafka?: {
    enabled: boolean;
    brokers: string[];
  };
};

export async function createApp(
  options: CreateAppOptions = {},
): Promise<FastifyInstance> {
  const app = Fastify({
    logger: options.logger ?? true,
  });

  // Register error handler first and AWAIT it
  await registerErrorHandler(app);

  await app.register(registerHealthRoutes);

  const prisma = createPrismaClient(options.databaseUrl ?? config.database.url);

  app.addHook("onClose", async () => {
    await prisma.$disconnect();
  });

  const redis = await createRedisClient(config.redis.url);
  app.addHook("onClose", async () => {
    await redis.quit();
  });

  const producer: EventProducer = options.kafka?.enabled
    ? (() => {
        const p = new KafkaJsProducer({
          clientId: "url-shortener",
          brokers: options.kafka!.brokers,
        });
        // we connect in a register block so createApp can remain sync
        return p as unknown as EventProducer;
      })()
    : new NoopProducer();

  void app.register(async () => {
    if (producer instanceof KafkaJsProducer) {
      await producer.init();
    }

    app.addHook("onClose", async () => {
      await producer.close();
    });
  });

  const usersRepo = new PrismaUserRepository(prisma);
  const externalIdentitiesRepo = new PrismaExternalIdentityRepository(prisma);
  const sessionsRepo = new PrismaSessionRepository(prisma);
  const apiKeysRepo = new PrismaApiKeyRepository(prisma);
  const auditRepo = new PrismaAuditLogRepository(prisma);
  const linksRepo = new PrismaLinkRepository(prisma);
  const passwordHasher = new BcryptPasswordHasher(12);

  const tokens = new JwtTokenService(config.jwt, sessionsRepo, usersRepo);

  const providers = new Map<string, AuthProviderPort>();
  providers.set(
    "local",
    new LocalPasswordAuthProvider(usersRepo, passwordHasher),
  );

  // Attach req.auth for all requests
  await app.register(registerAuthMiddleware, { tokens, apiKeys: apiKeysRepo });

  const rl = options.rateLimit ?? {
    redirect: { limit: 60, windowSeconds: 60 },
    api: { limit: 30, windowSeconds: 60 },
  };

  void app.register(registerRateLimitPlugin, { redis, config: rl });

  await app.register(async (instance) => {
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
      audit: auditRepo,
    });
  });

  await app.register(registerAdminRoutes);

  await app.register(registerMeRoutes);

  void app.register(async (instance) => {
    await registerApiKeyRoutes(instance, {
      repo: apiKeysRepo,
      audit: auditRepo,
    });
  });

  void app.register(async (instance) => {
    await registerLinkRoutes(instance, { links: linksRepo, audit: auditRepo });
  });

  app.get("/", async () => ({ service: "url-shortener" as const }));

  void app.register(async (instance) => {
    // register redirect route AFTER other routes to reduce conflicts
    await registerRedirectRoutes(instance, { links: linksRepo, redis });
  });

  return app;
}
