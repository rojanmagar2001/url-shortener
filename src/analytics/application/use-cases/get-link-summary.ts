import { err } from "@/shared/errors/index";
import type { AnalyticsReaderPort } from "@/analytics/application/ports/analytics-reader.port";
import type { LinkRepositoryPort } from "@/links/application/ports/link-repository.port";

export async function getLinkSummary(
  deps: { analytics: AnalyticsReaderPort; links: LinkRepositoryPort },
  input: { actorUserId: string; isAdmin: boolean; linkId: string },
): Promise<{ linkId: string; clicksTotal: number; clicksLast24h: number }> {
  if (!input.isAdmin) {
    const link = await deps.links.findById(input.linkId);
    if (!link) throw err("NOT_FOUND");
    if (link.userId !== input.actorUserId) throw err("FORBIDDEN");
  }

  return deps.analytics.getLinkSummary(input.linkId);
}
