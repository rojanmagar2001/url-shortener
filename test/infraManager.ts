import type { startInfra } from "./integration/infra";

type Infra = Awaited<ReturnType<typeof startInfra>>;

let infraInstance: Infra | null = null;
let initPromise: Promise<Infra> | null = null;

/**
 * Get the shared infrastructure instance.
 * This will return the same instance across all test files.
 */
export async function getInfra(): Promise<Infra> {
  // If we have a cached instance, return it
  if (infraInstance) {
    return infraInstance;
  }

  // If initialization is in progress, wait for it
  if (initPromise) {
    return initPromise;
  }

  // Start new initialization
  initPromise = (async () => {
    console.log("🔧 InfraManager: Initializing infrastructure...");
    const { startInfra: start } = await import("./integration/infra.js");
    infraInstance = await start();
    console.log("🔧 InfraManager: Infrastructure cached and ready");
    return infraInstance;
  })();

  try {
    const result = await initPromise;
    initPromise = null;
    return result;
  } catch (error) {
    initPromise = null;
    throw error;
  }
}

/**
 * DO NOT call this from individual tests!
 * Only called by global teardown.
 */
export async function cleanupInfra(): Promise<void> {
  if (infraInstance) {
    console.log("🔧 InfraManager: Cleaning up infrastructure...");
    const { stopInfra } = await import("./integration/infra.js");
    await stopInfra(infraInstance);
    infraInstance = null;
    console.log("🔧 InfraManager: Infrastructure cleaned up");
  }
}
