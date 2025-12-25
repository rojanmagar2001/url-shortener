import * as dotenv from "dotenv";
import { configSchema, type AppConfig } from "./schema";

dotenv.config();

/**
 * We read from process.env once, validate once, and export a typed config.
 * This prevents "undefined env var" failures from leaking into runtime code.
 */
function loadConfig(): AppConfig {
  const raw = {
    env: process.env.NODE_ENV ?? "development",
    http: {
      host: process.env.HOST ?? "0.0.0.0",
      port: process.env.PORT ?? "3000",
    },
    database: {
      url: process.env.DATABASE_URL ?? "",
    },
    redis: {
      url: process.env.REDIS_URL ?? "",
    },
    kafka: {
      brokers: process.env.KAFKA_BROKERS ?? "",
    },
    timescale: {
      url: process.env.TIMESCALE_URL ?? "",
    },
  };

  const parsed = configSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("\n");

    // Intentionally do not print raw env values to avoid leaking secrets.
    throw new Error(`Invalid configuration:\n${issues}`);
  }

  return parsed.data;
}

export const config = loadConfig();
