import { describe, expect, it } from "vitest";
import { Kafka } from "kafkajs";

import { ensureTimescaleSchema } from "@/analytics/infrastructure/timescale/schema";
import { TimescaleClickWriter } from "@/analytics/infrastructure/timescale/timescale-click-writer";
import { ClickEventConsumer } from "@/analytics/infrastructure/worker/click-consumer";
import { TOPICS } from "@/shared/kafka/topics";
import { Client } from "pg";
import { infraPromise } from "@/../test/setup-e2e";

describe("analytics click consumer (integration)", () => {
  let infra: Awaited<typeof infraPromise>;

  beforeAll(async () => {
    infra = await infraPromise;

    await ensureTimescaleSchema(infra.analyticsUrl);
  });

  it("writes click events to Timescale and is idempotent", async () => {
    const writer = new TimescaleClickWriter(infra.analyticsUrl);

    const consumer = new ClickEventConsumer(
      { brokers: infra.kafkaBrokers, groupId: `g-${Date.now()}-clicks` },
      writer,
    );
    await consumer.start();

    const kafka = new Kafka({
      clientId: "test-producer",
      brokers: infra.kafkaBrokers,
    });
    const producer = kafka.producer();
    await producer.connect();

    const event = {
      eventId: "evt-1",
      linkId: "link-123",
      code: "abc123",
      clickedAt: new Date().toISOString(),
      referrer: "https://ref.example",
      userAgent: "vitest",
      ipHash: "hash",
      country: null,
    };

    // Send twice -> idempotent insert should keep one row
    await producer.send({
      topic: TOPICS.linkClicked,
      messages: [
        { key: event.code, value: JSON.stringify(event) },
        { key: event.code, value: JSON.stringify(event) },
      ],
    });

    await producer.disconnect();

    // poll Timescale for up to ~2s
    const client = new Client({ connectionString: infra.analyticsUrl });
    await client.connect();

    let count = 0;
    for (let i = 0; i < 10; i++) {
      const res = await client.query(
        `SELECT count(*)::int AS c FROM click_events WHERE event_id = $1`,
        [event.eventId],
      );
      count = res.rows[0].c;
      if (count === 1) break;
      await new Promise((r) => setTimeout(r, 200));
    }

    await client.end();

    expect(count).toBe(1);

    await consumer.stop();
    await writer.close();
  });
});
