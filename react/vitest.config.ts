import path from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  // schematic-js is workspace-linked, so it otherwise resolves to a built
  // bundle. Point it at the source: these packages ship together, and a suite
  // that exercises the real client against last build's copy of it proves
  // nothing about the change under review.
  resolve: {
    alias: {
      "@schematichq/schematic-js": path.resolve(
        __dirname,
        "../js/src/index.ts",
      ),
    },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.spec.{ts,tsx}"],
    globals: true,
    typecheck: {
      enabled: true,
      tsconfig: "./tsconfig.test.json",
    },
  },
});
