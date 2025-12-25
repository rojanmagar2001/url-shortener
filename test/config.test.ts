import { describe, expect, it, vi } from "vitest";

describe("config loader", () => {
  it("fails fast with a clear error when required env vars are missing", async () => {
    vi.resetModules();

    const oldEnv = process.env;
    process.env = {
      ...oldEnv,
      NODE_ENV: "test",
      DATABASE_URL: "",
      REDIS_URL: "",
      KAFKA_BROKERS: "",
      TIMESCALE_URL: "",
      JWT_ISSUER: "",
      JWT_AUDIENCE: "",
      JWT_ACCESS_TTL_SECONDS: "",
      JWT_SECRET: "",
    };

    const load = async () => {
      // Dynamic import to re-run module initialization after env changes.
      await import("@/shared/config/index.js");
    };

    await expect(load()).rejects.toThrow(/Invalid configuration/);

    process.env = oldEnv;
  });

  it("parses brokers as a string array", async () => {
    vi.resetModules();

    const oldEnv = process.env;
    process.env = {
      ...oldEnv,
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://x",
      REDIS_URL: "redis://x",
      KAFKA_BROKERS: "k1:9092, k2:9092",
      TIMESCALE_URL: "postgresql://y",
      JWT_ISSUER: "iss",
      JWT_AUDIENCE: "aud",
      JWT_ACCESS_TTL_SECONDS: "900",
      JWT_SECRET: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    };

    const mod = await import("@/shared/config/index.js");
    expect(mod.config.kafka.brokers).toEqual(["k1:9092", "k2:9092"]);

    process.env = oldEnv;
  });
});
