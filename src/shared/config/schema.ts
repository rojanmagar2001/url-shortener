import { z } from "zod";

export const configSchema = z.object({
  env: z.enum(["development", "test", "production"]).default("development"),

  http: z.object({
    host: z.string().default("0.0.0.0"),
    port: z.coerce.number().int().min(1).max(65535).default(3000),
  }),

  database: z.object({
    url: z.string().min(1, "DATABASE_URL is required"),
  }),

  redis: z.object({
    url: z.string().min(1, "REDIS_URL is required"),
  }),

  kafka: z.object({
    brokers: z
      .string()
      .min(1, "KAFKA_BROKERS is required")
      .transform((s) =>
        s
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
      ),
  }),

  timescale: z.object({
    url: z.string().min(1, "TIMESCALE_URL is required"),
  }),

  jwt: z.object({
    issuer: z.string().min(1, "JWT_ISSUER is required"),
    audience: z.string().min(1, "JWT_AUDIENCE is required"),
    accessTtlSeconds: z.coerce.number().int().min(60).max(86400).default(900),
    secret: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  }),
});

export type AppConfig = z.infer<typeof configSchema>;
