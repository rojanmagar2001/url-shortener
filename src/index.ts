import { config } from "@/shared/config/index.js";
import { createApp } from "@/app.js";

async function main(): Promise<void> {
  const app = createApp({ logger: config.env !== "test" });

  const shutdown = async (signal: string): Promise<void> => {
    try {
      app.log.info({ signal }, "shutting down");
      await app.close();
      process.exit(0);
    } catch (err) {
      app.log.error({ err }, "shutdown failed");
      process.exit(1);
    }
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));

  await app.listen({
    port: config.http.port,
    host: config.http.host,
  });

  app.log.info(
    { host: config.http.host, port: config.http.port },
    "server listening",
  );
}

void main();
