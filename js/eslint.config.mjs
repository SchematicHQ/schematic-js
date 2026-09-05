import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

// We define separate linter configurations for tests vs. production code,
// because we have separate typescript configs.
export default defineConfig([
  // Generated API clients are formatted by the generator + prettier; eslint
  // fights the generator (e.g. --fix strips their eslint-disable headers).
  {
    ignores: ["src/company/api/company/**"],
  },
  {
    files: ["**/*.{js,mjs,cjs,ts}"],
    ignores: ["**/*.spec.ts", "**/*.test.ts"],
    plugins: { js },
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.json"],
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      "@typescript-eslint/strict-boolean-expressions": [
        2,
        {
          allowString: false,
          allowNumber: false,
        },
      ],
    },
  },
  {
    files: ["**/*.spec.ts", "**/*.test.ts"],
    plugins: { js },
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.test.json"],
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    ignores: ["src/frontend/generated/*", "dist/*"],
  },
]);
