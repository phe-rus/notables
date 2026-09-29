import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Local D1/R2 via wrangler's platform proxy take a moment to boot.
    hookTimeout: 60_000,
  },
});
