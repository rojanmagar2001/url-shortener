// infraManager.ts
import type { startInfra } from "./integration/infra";

type Infra = Awaited<ReturnType<typeof startInfra>>;

let infraInstance: Infra | null = null;
let initPromise: Promise<Infra> | null = null;

export async function getInfra(): Promise<Infra> {
  // Ensure only one initialization happens even with concurrent calls
  if (initPromise) {
    return initPromise;
  }

  if (!infraInstance) {
    initPromise = (async () => {
      const { startInfra } = await import("./integration/infra.js");
      infraInstance = await startInfra();
      return infraInstance;
    })();

    await initPromise;
    initPromise = null;
  }

  return infraInstance!;
}

export async function cleanupInfra(): Promise<void> {
  if (infraInstance) {
    const { stopInfra } = await import("./integration/infra.js");
    await stopInfra(infraInstance);
    infraInstance = null;
  }
}
