import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  // The schematic-icons workspace ships its own copies of react / react-dom /
  // styled-components for its own tooling. Without dedupe vitest resolves
  // two copies of each and component renders explode with
  // "Cannot read properties of null (reading 'useContext')".
  resolve: {
    dedupe: ["react", "react-dom", "styled-components"],
    alias: {
      // Self-package import: /components source pulls shared core
      // (`SchematicContext`, hooks, `WsAdapter`, embed-loader) from the root
      // entry to avoid duplicating those modules across the two subpath
      // bundles (see SCHY-372 / comment at the top of
      // `src/components/index.tsx`). Tests run against source, so we redirect
      // the self-reference to the local source file here.
      "@schematichq/schematic-react": path.resolve(__dirname, "src/index.tsx"),
    },
  },
  test: {
    environment: "jsdom",
    environmentOptions: {
      jsdom: {
        resources: "usable",
        url: "http://localhost:3000",
      },
    },
    include: [
      "src/**/*.spec.{ts,tsx}",
      "src/**/*.test.{ts,tsx}",
    ],
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
