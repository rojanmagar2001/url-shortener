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
  console.log("🐳 Starting PostgreSQL...");
  // PostgreSQL with minimal resources
  const postgres = await new GenericContainer("postgres:16-alpine")
    .withEnvironment({
      POSTGRES_USER: "test",
      POSTGRES_PASSWORD: "test",
      POSTGRES_DB: "app",
    })
    .withCommand([
      "postgres",
      "-c",
      "shared_buffers=32MB",
      "-c",
      "max_connections=50",
      "-c",
      "fsync=off",
      "-c",
      "synchronous_commit=off",
      "-c",
      "full_page_writes=off",
      "-c",
      "random_page_cost=1.0",
    ])
    .withExposedPorts(5432)
    .withWaitStrategy(
      Wait.forLogMessage(/database system is ready to accept connections/, 2),
    )
    .withStartupTimeout(60_000)
    .start();

  const pgHost = postgres.getHost();
  const pgPort = postgres.getMappedPort(5432);
  const databaseUrl = `postgresql://test:test@${pgHost}:${pgPort}/app?schema=public`;

  console.log("📦 Running Prisma migrations...");
  await createDbPush(databaseUrl, 5);

  console.log("🐳 Starting Redis...");
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
    .withStartupTimeout(30_000)
    .start();

  const redisHost = redis.getHost();
  const redisPort = redis.getMappedPort(6379);
  const redisUrl = `redis://${redisHost}:${redisPort}`;

  console.log("🐳 Starting Kafka (Redpanda)...");
  // Lighter Kafka using Wurstmeister (uses less memory than Redpanda)
  const kafka = await new GenericContainer(
    "docker.redpanda.com/redpandadata/redpanda:v23.3.3",
  )
    .withExposedPorts(9092)
    .withCommand([
      "redpanda",
      "start",
      "--mode=dev-container",
      "--smp",
      "1",
      "--memory",
      "1G",
      "--reserve-memory",
      "0M",
      "--overprovisioned",
    ])
    .withWaitStrategy(Wait.forListeningPorts())
    .withStartupTimeout(120_000)
    .start();

  const kafkaHost = kafka.getHost();
  const kafkaPort = kafka.getMappedPort(9092);
  const kafkaBrokers = [`${kafkaHost}:${kafkaPort}`];

  console.log("🐳 Starting TimescaleDB...");
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
      "max_connections=50",
      "-c",
      "fsync=off",
      "-c",
      "synchronous_commit=off",
      "-c",
      "full_page_writes=off",
      "-c",
      "random_page_cost=1.0",
    ])
    .withExposedPorts(5432)
    .withWaitStrategy(
      Wait.forLogMessage(/database system is ready to accept connections/, 2),
    )
    .withStartupTimeout(60_000)
    .start();

  const tsHost = timescale.getHost();
  const tsPort = timescale.getMappedPort(5432);
  const analyticsUrl = `postgresql://test:test@${tsHost}:${tsPort}/analytics`;

  // console.log("✅ All infrastructure started successfully!");
  // console.log(`   PostgreSQL: ${pgHost}:${pgPort}`);
  // console.log(`   Redis: ${redisHost}:${redisPort}`);
  // console.log(`   Kafka: ${kafkaHost}:${kafkaPort}`);
  // console.log(`   TimescaleDB: ${tsHost}:${tsPort}`);

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

  console.log("🧹 Stopping test infrastructure...");

  await Promise.allSettled([
    infra.timescale?.stop(),
    infra.kafka?.stop(),
    infra.redis?.stop(),
    infra.postgres?.stop(),
  ]);

  console.log("✅ All containers stopped");
}
