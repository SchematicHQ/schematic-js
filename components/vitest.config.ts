import path from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  // The schematic-icons workspace is linked in via `yarn link` and ships its
  // own copies of react / react-dom / styled-components for its own tooling.
  // Without dedupe, vitest resolves two copies of each and component renders
  // explode with "Cannot read properties of null (reading 'useContext')".
  resolve: {
    // The yarn-linked schematic packages are aliased to their sources so
    // vite processes them and the react/react-dom dedupe applies to their
    // imports; their prebuilt CJS dists would otherwise load a second React
    // copy from their own node_modules.
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
    dedupe: ["react", "react-dom", "styled-components"],
  },
  test: {
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
    noExternal: [
      "@schematichq/schematic-icons",
      // Linked in via `yarn link` like icons; must be processed by vite so
      // the react/react-dom dedupe above applies to their imports too.
      "@schematichq/schematic-js",
      "@schematichq/schematic-react",
    ],
  },
});
