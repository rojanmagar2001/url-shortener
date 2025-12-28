import { Kafka, logLevel, type Consumer } from "kafkajs";
import type { ClickEventWriterPort } from "@/analytics/application/ports/click-event-writer.port";
import type { LinkClickedEvent } from "@/shared/events/link-clicked-event";
import type { ClickEvent } from "@/analytics/domain/click-event";
import { TOPICS } from "@/shared/kafka/topics";

export type ClickConsumerConfig = {
  brokers: string[];
  groupId: string;
  topic?: string; // default link-clicked
};

export class ClickEventConsumer {
  private readonly consumer: Consumer;

  constructor(
    private readonly cfg: ClickConsumerConfig,
    private readonly writer: ClickEventWriterPort,
  ) {
    const kafka = new Kafka({
      clientId: "analytics-worker",
      brokers: cfg.brokers,
      logLevel: logLevel.NOTHING,
    });

    this.consumer = kafka.consumer({ groupId: cfg.groupId });
  }

  async start(): Promise<void> {
    await this.consumer.connect();
    await this.consumer.subscribe({
      topic: this.cfg.topic ?? TOPICS.linkClicked,
      fromBeginning: true,
    });

    // We want commit AFTER DB write; easiest is to disable autocommit.
    await this.consumer.run({
      autoCommit: false,
      eachMessage: async ({ topic, partition, message }) => {
        if (!message.value) return;

        const raw = message.value.toString("utf8");
        const parsed = JSON.parse(raw) as LinkClickedEvent;

        const click: ClickEvent = {
          eventId: parsed.eventId,
          linkId: parsed.linkId,
          code: parsed.code,
          clickedAt: new Date(parsed.clickedAt),
          referrer: parsed.referrer ?? null,
          userAgent: parsed.userAgent ?? null,
          ipHash: parsed.ipHash ?? null,
          country: (parsed as any).country ?? null,
        };

        // 1) write to Timescale
        await this.writer.writeClickEvent(click);

        // 2) commit offset AFTER successful DB write
        const nextOffset = (BigInt(message.offset) + 1n).toString();
        await this.consumer.commitOffsets([
          { topic, partition, offset: nextOffset },
        ]);
      },
    });
  }

  async stop(): Promise<void> {
    await this.consumer.disconnect();
  }
}
