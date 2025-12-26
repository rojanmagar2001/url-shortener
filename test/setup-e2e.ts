// setup-e2e.ts
import { afterAll } from "vitest";
import { getInfra, cleanupInfra } from "./infraManager";

// Initialize once when this module is imported
export const infraPromise = getInfra();

// Cleanup after all tests
afterAll(async () => {
  await cleanupInfra();
});
