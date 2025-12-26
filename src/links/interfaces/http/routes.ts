import type { FastifyInstance } from "fastify";
import { z } from "zod";
import "@/identity/interfaces/http/auth-context";
import {
  requireAuth,
  requireScope,
} from "@/identity/interfaces/http/middleware";
import { createLinkSchema } from "./schemas";
import { createLink } from "@/links/application/use-cases/create-link";
import type { LinkRepositoryPort } from "@/links/application/ports/link-repository.port";
import type { AuditLogRepositoryPort } from "@/audit/application/ports/audit-log-repository.port";
import { ipHashOf, userAgentOf } from "@/audit/interfaces/http/helpers";

function parseOrThrow<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw parsed.error;
  return parsed.data;
}

export async function registerLinkRoutes(
  app: FastifyInstance,
  deps: { links: LinkRepositoryPort; audit: AuditLogRepositoryPort },
): Promise<void> {
  app.post("/api/links", async (req, reply) => {
    requireAuth(req.auth);

    // API keys must have scope
    if (req.auth.kind === "api_key") {
      requireScope(req.auth, "links:write");
    }

    const body = parseOrThrow(createLinkSchema, req.body);
    const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;

    const result = await createLink(
      { links: deps.links },
      {
        userId: req.auth.userId,
        originalUrl: body.originalUrl,
        customAlias: body.customAlias,
        expiresAt,
        createdByIpHash: ipHashOf(req),
      },
    );

    await deps.audit.create({
      actorType: req.auth.kind === "api_key" ? "api_key" : "user",
      actorUserId: req.auth.userId,
      actorApiKeyId: req.auth.kind === "api_key" ? req.auth.apiKeyId : null,
      action: "links.create",
      resourceType: "link",
      resourceId: result.linkId,
      ipHash: ipHashOf(req),
      userAgent: userAgentOf(req),
      metadata: { code: result.code },
    });

    return reply.status(201).send(result);
  });
}
