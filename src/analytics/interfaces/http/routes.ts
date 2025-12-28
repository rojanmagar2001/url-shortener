import type { FastifyInstance } from "fastify";
import { z } from "zod";
import "@/identity/interfaces/http/auth-context";
import {
  requireAuth,
  requireAdmin,
  requireScope,
} from "@/identity/interfaces/http/middleware";
import type { AnalyticsReaderPort } from "@/analytics/application/ports/analytics-reader.port";
import type { LinkRepositoryPort } from "@/links/application/ports/link-repository.port";
import { getLinkSummary } from "@/analytics/application/use-cases/get-link-summary";
import { getTopLinks } from "@/analytics/application/use-cases/get-top-links";
import { topLinksQuerySchema } from "./schemas";

function parseOrThrow<T>(schema: z.ZodType<T>, value: unknown): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) throw parsed.error;
  return parsed.data;
}

export async function registerAnalyticsRoutes(
  app: FastifyInstance,
  deps: { analytics: AnalyticsReaderPort; links: LinkRepositoryPort },
): Promise<void> {
  // Owner/admin link summary
  app.get("/api/analytics/links/:linkId/summary", async (req) => {
    requireAuth(req.auth);

    if (req.auth.kind === "api_key") {
      requireScope(req.auth, "analytics:read");
    }

    const linkId = (req.params as any).linkId as string;
    const isAdmin = req.auth.kind === "user" && req.auth.role === "admin";

    return getLinkSummary(deps, {
      actorUserId: req.auth.userId,
      isAdmin,
      linkId,
    });
  });

  // Admin global view
  app.get("/admin/api/analytics/top-links", async (req) => {
    requireAdmin(req.auth);

    const query = parseOrThrow(topLinksQuerySchema, (req as any).query);
    return getTopLinks(
      { analytics: deps.analytics },
      { minutes: query.minutes, limit: query.limit },
    );
  });
}
