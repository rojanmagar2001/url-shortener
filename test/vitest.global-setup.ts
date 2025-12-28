// vitest.global-setup.ts

import { getInfra, cleanupInfra } from "./infraManager.js";

export async function setup() {
  console.log("\n🚀 Global Setup: Starting test infrastructure...\n");

  // This triggers infrastructure startup
  const infra = await getInfra();

  // Store in environment variables (accessible in all tests)
  process.env.TEST_DATABASE_URL = infra.databaseUrl;
  process.env.TEST_REDIS_URL = infra.redisUrl;
  process.env.TEST_KAFKA_BROKERS = infra.kafkaBrokers.join(",");
  process.env.TEST_ANALYTICS_URL = infra.analyticsUrl;

  console.log("\n✅ Global Setup: Infrastructure ready for tests\n");

  // Return teardown function
  return async () => {
    console.log("\n🧹 Global Teardown: Cleaning up infrastructure...\n");

    // This stops the shared infrastructure
    await cleanupInfra();

    // Clean up environment variables
    delete process.env.TEST_DATABASE_URL;
    delete process.env.TEST_REDIS_URL;
    delete process.env.TEST_KAFKA_BROKERS;
    delete process.env.TEST_ANALYTICS_URL;

    console.log("\n✅ Global Teardown: Complete\n");
  };
}
