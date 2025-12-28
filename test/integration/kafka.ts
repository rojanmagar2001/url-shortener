import { Kafka } from "kafkajs";

export async function consumeOneJson<T>(args: {
  brokers: string[];
  topic: string;
  groupId: string;
  timeoutMs?: number;
}): Promise<{ key: string | null; value: T }> {
  const kafka = new Kafka({ clientId: "test-consumer", brokers: args.brokers });
  const consumer = kafka.consumer({ groupId: args.groupId });

  const timeoutMs = args.timeoutMs ?? 5000;

  await consumer.connect();
  await consumer.subscribe({ topic: args.topic, fromBeginning: true });

  let resolveFn: ((v: { key: string | null; value: T }) => void) | null = null;
  const p = new Promise<{ key: string | null; value: T }>(
    (resolve) => (resolveFn = resolve),
  );

  const timer = setTimeout(async () => {
    await consumer.disconnect();
    throw new Error(`Timed out waiting for message on ${args.topic}`);
  }, timeoutMs);

  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!resolveFn) return;
      clearTimeout(timer);

      const key = message.key ? message.key.toString("utf8") : null;
      const raw = message.value ? message.value.toString("utf8") : "";
      const value = JSON.parse(raw) as T;

      const r = resolveFn;
      resolveFn = null;

      await consumer.disconnect();
      r({ key, value });
    },
  });

  return p;
}
