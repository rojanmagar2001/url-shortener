import type { FastifyInstance } from "fastify";
import { z } from "zod";
import "@/identity/interfaces/http/auth-context";
import { requireAuth } from "@/identity/interfaces/http/middleware";
import { err } from "@/shared/errors";
import { createApiKeySchema } from "./schemas";
import { createApiKey } from "@/access/application/use-cases/create-api-key";
import type { ApiKeyRepositoryPort } from "@/access/application/ports/api-key-repository.port";

function parseOrThrow<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw parsed.error;
  return parsed.data;
}

export async function registerApiKeyRoutes(
  app: FastifyInstance,
  deps: { repo: ApiKeyRepositoryPort },
): Promise<void> {
  app.post("/settings/api-keys", async (req, reply) => {
    requireAuth(req.auth);
    if (req.auth.kind !== "user") throw err("FORBIDDEN");

    const body = parseOrThrow(createApiKeySchema, req.body);
    const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;

    const result = await createApiKey(
      { repo: deps.repo },
      {
        userId: req.auth.userId,
        name: body.name,
        scopes: body.scopes,
        expiresAt,
      },
    );

    return reply.status(201).send(result);
  });
}
