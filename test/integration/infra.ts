import {
  GenericContainer,
  type StartedTestContainer,
  Wait,
} from "testcontainers";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export type StartedInfra = {
  postgres: StartedTestContainer;
  redis: StartedTestContainer;
  kafka: StartedTestContainer;
  timescale: StartedTestContainer;
  databaseUrl: string;
  redisUrl: string;
  kafkaBrokers: string[];
  analyticsUrl: string;
};

async function createDbPush(
  databaseUrl: string,
  maxRetries = 5,
): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await execAsync("pnpm exec prisma db push --accept-data-loss", {
        env: { ...process.env, DATABASE_URL: databaseUrl },
      });
      return;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, Math.pow(2, i) * 100));
    }
  }
}

export async function startInfra(): Promise<StartedInfra> {
  // PostgreSQL with minimal resources
  const postgres = await new GenericContainer("postgres:16-alpine")
    .withEnvironment({
      POSTGRES_USER: "test",
      POSTGRES_PASSWORD: "test",
      POSTGRES_DB: "app",
      POSTGRES_INITDB_ARGS: "-c shared_buffers=32MB -c max_connections=20",
    })
    .withCommand([
      "postgres",
      "-c",
      "shared_buffers=32MB",
      "-c",
      "max_connections=20",
      "-c",
      "fsync=off",
      "-c",
      "synchronous_commit=off",
      "-c",
      "full_page_writes=off",
    ])
    .withExposedPorts(5432)
    .withWaitStrategy(
      Wait.forLogMessage(/database system is ready to accept connections/, 2),
    )
    .start();

  const pgHost = postgres.getHost();
  const pgPort = postgres.getMappedPort(5432);
  const databaseUrl = `postgresql://test:test@${pgHost}:${pgPort}/app?schema=public`;

  await createDbPush(databaseUrl, 5);

  // Redis with minimal memory
  const redis = await new GenericContainer("redis:7-alpine")
    .withExposedPorts(6379)
    .withCommand([
      "redis-server",
      "--maxmemory",
      "64mb",
      "--maxmemory-policy",
      "allkeys-lru",
      "--save",
      "",
      "--appendonly",
      "no",
    ])
    .withWaitStrategy(Wait.forLogMessage(/Ready to accept connections/))
    .start();

  const redisHost = redis.getHost();
  const redisPort = redis.getMappedPort(6379);
  const redisUrl = `redis://${redisHost}:${redisPort}`;

  // Redpanda with minimal resources
  const kafka = await new GenericContainer(
    "docker.redpanda.com/redpandadata/redpanda:latest",
  )
    .withExposedPorts(19092, 9092)
    .withCommand([
      "redpanda",
      "start",
      "--overprovisioned",
      "--smp",
      "1",
      "--memory",
      "512M",
      "--reserve-memory",
      "0M",
      "--node-id",
      "0",
      "--check=false",
      "--kafka-addr",
      "PLAINTEXT://0.0.0.0:9092",
      "--advertise-kafka-addr",
      "PLAINTEXT://localhost:19092",
    ])
    .withWaitStrategy(Wait.forListeningPorts())
    .start();

  const kafkaBrokers = ["localhost:19092"];

  // TimescaleDB with minimal resources
  const timescale = await new GenericContainer(
    "timescale/timescaledb:2.14.2-pg16",
  )
    .withEnvironment({
      POSTGRES_USER: "test",
      POSTGRES_PASSWORD: "test",
      POSTGRES_DB: "analytics",
    })
    .withCommand([
      "postgres",
      "-c",
      "shared_buffers=32MB",
      "-c",
      "max_connections=20",
      "-c",
      "fsync=off",
      "-c",
      "synchronous_commit=off",
      "-c",
      "full_page_writes=off",
    ])
    .withExposedPorts(5432)
    .withWaitStrategy(
      Wait.forLogMessage(/database system is ready to accept connections/, 2),
    )
    .start();

  const tsHost = timescale.getHost();
  const tsPort = timescale.getMappedPort(5432);
  const analyticsUrl = `postgresql://test:test@${tsHost}:${tsPort}/analytics`;

  return {
    postgres,
    redis,
    kafka,
    timescale,
    databaseUrl,
    redisUrl,
    kafkaBrokers,
    analyticsUrl,
  };
}

export async function stopInfra(infra: StartedInfra): Promise<void> {
  if (!infra) return;

  await Promise.allSettled([
    infra.timescale?.stop(),
    infra.kafka?.stop(),
    infra.redis?.stop(),
    infra.postgres?.stop(),
  ]);
}
