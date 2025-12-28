import { createClient, type RedisClientType } from "redis";

export type AppRedis = ReturnType<typeof createClient>;

export async function createRedisClient(url: string): Promise<AppRedis> {
  const client = createClient({ url });

  // Avoid crashing the process on transient redis errors; log at app layer later.
  client.on("error", () => undefined);

  await client.connect();

  return client;
}
