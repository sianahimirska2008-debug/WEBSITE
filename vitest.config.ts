import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // Next's server-only guard throws outside React Server Components.
      "server-only": path.resolve(__dirname, "tests/server-only-stub.ts"),
    },
  },
  test: {
    environment: "node",
    globalSetup: ["./tests/global-setup.ts"],
    env: { DATABASE_URL: "file:./test.db", STRIPE_SECRET_KEY: "", PLATFORM_COMMISSION_BPS: "1500" },
    fileParallelism: false,
    testTimeout: 20_000,
  },
});
