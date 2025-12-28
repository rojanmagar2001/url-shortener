import { Pool } from "pg";
import type {
  AnalyticsReaderPort,
  LinkSummary,
  TopLinkRow,
} from "@/analytics/application/ports/analytics-reader.port";

export class TimescaleAnalyticsReader implements AnalyticsReaderPort {
  private readonly pool: Pool;

  constructor(analyticsUrl: string) {
    this.pool = new Pool({ connectionString: analyticsUrl });
  }

  async getLinkSummary(linkId: string): Promise<LinkSummary> {
    const totalRes = await this.pool.query(
      `SELECT count(*)::int AS c FROM click_events WHERE link_id = $1`,
      [linkId],
    );

    const last24Res = await this.pool.query(
      `SELECT count(*)::int AS c
       FROM click_events
       WHERE link_id = $1 AND clicked_at >= now() - interval '24 hours'`,
      [linkId],
    );

    return {
      linkId,
      clicksTotal: totalRes.rows[0].c,
      clicksLast24h: last24Res.rows[0].c,
    };
  }

  async getTopLinks(minutes: number, limit: number): Promise<TopLinkRow[]> {
    const res = await this.pool.query(
      `
      SELECT link_id, code, count(*)::int AS clicks
      FROM click_events
      WHERE clicked_at >= now() - ($1::text || ' minutes')::interval
      GROUP BY link_id, code
      ORDER BY clicks DESC
      LIMIT $2
      `,
      [String(minutes), limit],
    );

    return res.rows.map((r) => ({
      linkId: r.link_id,
      code: r.code,
      clicks: r.clicks,
    }));
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
