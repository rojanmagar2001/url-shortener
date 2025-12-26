// vitest.global-setup.ts
let infra: any; // Replace with your actual infra type

export async function setup() {
  const { startInfra } = await import("./integration/infra.js"); // adjust path
  infra = await startInfra();

  // Store in environment variables (accessible in tests)
  process.env.TEST_DB_URL = infra.dbUrl;
  process.env.TEST_API_URL = infra.apiUrl;

  // Return teardown function
  return async () => {
    const { stopInfra } = await import("./integration/infra.js");
    await stopInfra(infra);
  };
}
