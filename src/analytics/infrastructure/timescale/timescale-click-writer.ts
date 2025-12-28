import { Pool } from "pg";
import type { ClickEventWriterPort } from "@/analytics/application/ports/click-event-writer.port";
import type { ClickEvent } from "@/analytics/domain/click-event";

export class TimescaleClickWriter implements ClickEventWriterPort {
  private readonly pool: Pool;

  constructor(analyticsUrl: string) {
    this.pool = new Pool({ connectionString: analyticsUrl });
  }

  async writeClickEvent(event: ClickEvent): Promise<void> {
    // Idempotent by event_id
    await this.pool.query(
      `
      INSERT INTO click_events (
        event_id, link_id, code, clicked_at, referrer, user_agent, ip_hash, country
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT (event_id) DO NOTHING
      `,
      [
        event.eventId,
        event.linkId,
        event.code,
        event.clickedAt.toISOString(),
        event.referrer,
        event.userAgent,
        event.ipHash,
        event.country,
      ],
    );
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
