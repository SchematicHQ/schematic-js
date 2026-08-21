import { defineConfig, mergeConfig } from "vitest/config";
import baseConfig from "./vitest.config";

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      environment: "node",
      // The customer hook tests render through @testing-library and need a
      // DOM; the React Native sweep only verifies the DOM-free surface.
      exclude: ["**/node_modules/**", "src/hooks/customer.spec.tsx"],
    },
  })
);
