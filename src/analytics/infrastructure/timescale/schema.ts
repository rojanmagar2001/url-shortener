import { Client } from "pg";

export async function ensureTimescaleSchema(
  analyticsUrl: string,
): Promise<void> {
  const client = new Client({ connectionString: analyticsUrl });
  await client.connect();

  // Timescale extension should exist in the image, but CREATE EXTENSION is safe/needed.
  await client.query(`CREATE EXTENSION IF NOT EXISTS timescaledb;`);

  await client.query(`
    CREATE TABLE IF NOT EXISTS click_events (
      event_id TEXT PRIMARY KEY,
      link_id TEXT NOT NULL,
      code TEXT NOT NULL,
      clicked_at TIMESTAMPTZ NOT NULL,
      referrer TEXT NULL,
      user_agent TEXT NULL,
      ip_hash TEXT NULL,
      country TEXT NULL
    );
  `);

  // Convert to hypertable if not already.
  // This will no-op if already a hypertable.
  await client.query(`
    SELECT create_hypertable('click_events', 'clicked_at', if_not_exists => TRUE);
  `);

  await client.end();
}
