import { Kafka, logLevel, type Producer } from "kafkajs";
import type { TopicName } from "@/shared/kafka/topics";

export type EventProducer = {
  publish(topic: TopicName, key: string, value: unknown): Promise<void>;
  close(): Promise<void>;
};

export class NoopProducer implements EventProducer {
  async publish(): Promise<void> {}
  async close(): Promise<void> {}
}

export type KafkaProducerConfig = {
  clientId: string;
  brokers: string[];
};

export class KafkaJsProducer implements EventProducer {
  private readonly kafka: Kafka;
  private readonly producer: Producer;

  constructor(cfg: KafkaProducerConfig) {
    this.kafka = new Kafka({
      clientId: cfg.clientId,
      brokers: cfg.brokers,
      logLevel: logLevel.NOTHING,
    });

    // Idempotence helps reduce duplicates on retries.
    this.producer = this.kafka.producer({
      idempotent: true,
      maxInFlightRequests: 1,
    });
  }

  async init(): Promise<void> {
    await this.producer.connect();
  }

  async publish(topic: TopicName, key: string, value: unknown): Promise<void> {
    await this.producer.send({
      topic,
      messages: [{ key, value: JSON.stringify(value) }],
    });
  }

  async close(): Promise<void> {
    await this.producer.disconnect();
  }
}
