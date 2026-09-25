import path from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  // schematic-icons ships its own copies of react / react-dom /
  // styled-components for its own tooling.
  // Without dedupe, vitest resolves two copies of each and component renders
  // explode with "Cannot read properties of null (reading 'useContext')".
  resolve: {
    dedupe: ["react", "react-dom", "styled-components"],
    // Resolve the sibling SDKs from source. They live in this repo, and a
    // suite run against a stale published or symlinked build proves nothing
    // about the change under review.
    alias: {
      "@schematichq/schematic-react": path.resolve(
        __dirname,
        "../react/src/index.ts",
      ),
      "@schematichq/schematic-js": path.resolve(
        __dirname,
        "../js/src/index.ts",
      ),
    },
  },
  test: {
    // icons.test.ts reads the icon package's stylesheet as text (`?raw`).
    // Vitest replaces every stylesheet it is not told to process with an
    // empty string, the query notwithstanding, so that one is opted in.
    css: { include: [/schematic-icons\.css/] },
    environment: "jsdom",
    environmentOptions: {
      jsdom: {
        resources: "usable",
        url: "http://localhost:3000",
      },
    },
    include: ["src/**/*.test.{ts,tsx}"],
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    typecheck: {
      enabled: true,
      tsconfig: "./tsconfig.test.json",
    },
  },
  ssr: {
    noExternal: ["@schematichq/schematic-icons"],
  },
});
