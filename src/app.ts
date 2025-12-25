import Fastify, { type FastifyInstance } from "fastify";
import { registerHealthRoutes } from "@/shared/http/routes/health.js";

export type CreateAppOptions = {
  logger?: boolean;
};

export function createApp(options: CreateAppOptions = {}): FastifyInstance {
  const app = Fastify({
    logger: options.logger ?? true,
    // Keep defaults for now; we’ll harden later (headers/timeouts/trustProxy/etc).
  });

  void app.register(registerHealthRoutes);

  // Minimal root endpoint to avoid accidental 404 confusion in early manual tests
  app.get("/", async () => ({ service: "url-shortener" as const }));

  return app;
}
