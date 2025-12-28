import type { FastifyInstance } from "fastify";
import { z } from "zod";
import "@/identity/interfaces/http/auth-context";
import { requireAuth } from "@/identity/interfaces/http/middleware";
import { err } from "@/shared/errors";
import { createApiKeySchema } from "./schemas";
import { createApiKey } from "@/access/application/use-cases/create-api-key";
import type { ApiKeyRepositoryPort } from "@/access/application/ports/api-key-repository.port";
import type { AuditLogRepositoryPort } from "@/audit/application/ports/audit-log-repository.port";
import { ipHashOf, userAgentOf } from "@/audit/interfaces/http/helpers";
import { EventProducer } from "@/shared/kafka/producer";
import { AuditEvent } from "@/shared/events/audit-event";
import { TOPICS } from "@/shared/kafka/topics";
import { randomUUID } from "crypto";

function parseOrThrow<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw parsed.error;
  return parsed.data;
}

export async function registerApiKeyRoutes(
  app: FastifyInstance,
  deps: {
    repo: ApiKeyRepositoryPort;
    audit: AuditLogRepositoryPort;
    producer: EventProducer;
  },
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

    const auditRow = await deps.audit.create({
      actorType: "user",
      actorUserId: req.auth.userId,
      actorApiKeyId: null,
      action: "access.api-key.create",
      resourceType: "api_key",
      resourceId: result.apiKeyId,
      ipHash: ipHashOf(req),
      userAgent: userAgentOf(req),
      metadata: { name: body.name, scopes: body.scopes },
    });

    const evt: AuditEvent = {
      eventId: randomUUID(),
      occurredAt: new Date().toISOString(),
      actorType: auditRow.actorType,
      actorUserId: auditRow.actorUserId,
      actorApiKeyId: auditRow.actorApiKeyId,
      action: auditRow.action,
      resourceType: auditRow.resourceType,
      resourceId: auditRow.resourceId,
      ipHash: auditRow.ipHash,
      userAgent: auditRow.userAgent,
      metadata: auditRow.metadata,
    };

    await deps.producer.publish(TOPICS.audit, auditRow.id, evt);

    return reply.status(201).send(result);
  });
}
