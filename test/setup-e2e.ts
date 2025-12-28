// setup-e2e.ts
import { getInfra } from "./infraManager";

// Initialize once when this module is imported
// This returns the SAME promise for all test files
export const infraPromise = getInfra();

// DO NOT add afterAll here - it would run after EACH test file
// Cleanup is handled by vitest.global-setup.ts teardown
