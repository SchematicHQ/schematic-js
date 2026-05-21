import { defineConfig, mergeConfig } from "vitest/config";

import baseConfig from "./vitest.config";

// React Native smoke tests: verify the lightweight root entry (WS-backed
// flags/entitlements) imports and runs in a no-DOM environment. The heavy
// `/components` subpath ships UI that depends on jsdom and is not consumed
// by React Native, so we exclude src/components/** here.
export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      environment: "node",
      exclude: ["src/components/**", "node_modules/**", "dist/**"],
    },
  }),
);
