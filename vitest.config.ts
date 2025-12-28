import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  test: {
    environment: "node",
    globalSetup: ["./test/vitest.global-setup.ts"],
    setupFiles: ["./test/setup-e2e.ts"],
    // Longer timeout for container startup
    testTimeout: 60_000,
    hookTimeout: 120_000,
    include: ["test/**/*.test.ts"],
    fileParallelism: false,
    // Use threads instead of forks for shared memory
    coverage: {
      reporter: ["text", "html"],
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
});
