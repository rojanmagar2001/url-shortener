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
  databaseUrl: string;
  redisUrl: string;
  kafkaBrokers: string[];
};

async function createDbPush(
  databaseUrl: string,
  maxRetries = 5,
): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      // Apply migrations to the container DB
      await execAsync("pnpm exec prisma db push --accept-data-loss", {
        env: { ...process.env, DATABASE_URL: databaseUrl },
      });
      return; // Success!
    } catch (error) {
      if (i === maxRetries - 1) throw error; // Last attempt failed
      // Wait before retrying (exponential backoff)
      await new Promise((resolve) => setTimeout(resolve, Math.pow(2, i) * 100));
    }
  }
}

export async function startInfra(): Promise<StartedInfra> {
  const postgres = await new GenericContainer("postgres:16-alpine")
    .withEnvironment({
      POSTGRES_USER: "test",
      POSTGRES_PASSWORD: "test",
      POSTGRES_DB: "app",
    })
    .withExposedPorts(5432)
    .withWaitStrategy(
      Wait.forLogMessage("database system is ready to accept connections"),
    )
    .start();

  const pgHost = postgres.getHost();
  const pgPort = postgres.getMappedPort(5432);
  const databaseUrl = `postgresql://test:test@${pgHost}:${pgPort}/app?schema=public`;

  await createDbPush(databaseUrl, 5);

  const redis = await new GenericContainer("redis:7-alpine")
    .withExposedPorts(6379)
    .withWaitStrategy(Wait.forLogMessage("Ready to accept connections"))
    .start();

  const redisHost = redis.getHost();
  const redisPort = redis.getMappedPort(6379);
  const redisUrl = `redis://${redisHost}:${redisPort}`;

  // Redpanda: expose Kafka on fixed port so advertised address works reliably
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
      "1G",
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

  return { postgres, redis, kafka, databaseUrl, redisUrl, kafkaBrokers };
}

export async function stopInfra(infra: StartedInfra): Promise<void> {
  if (!infra) return;
  await infra.kafka.stop();
  await infra.redis?.stop();
  await infra.postgres?.stop();
}
