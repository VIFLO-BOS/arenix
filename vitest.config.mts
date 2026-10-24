import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  // Vite 8 (rolldown/oxc): tsconfig has jsx "preserve" for Next, so force the automatic runtime here.
  oxc: { jsx: { runtime: "automatic" } },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    env: { AUTH_SECRET: "test-secret-test-secret-test-secret-123456" },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "server-only": path.resolve(__dirname, "tests/unit/_server-only-stub.ts"),
    },
  },
});
