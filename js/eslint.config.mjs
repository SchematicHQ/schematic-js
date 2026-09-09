import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

// We define separate linter configurations for tests vs. production code,
// because we have separate typescript configs.
export default defineConfig([
  // Generated API clients are formatted by the generator + prettier; eslint
  // fights the generator (e.g. --fix strips their eslint-disable headers).
  // Both generated trees, not just the new one: `lint` runs --fix with
  // --report-unused-disable-directives, so linting src/types/api rewrites the
  // committed client's headers and leaves the working tree dirty.
  {
    ignores: ["src/billing/api/generated/**", "src/types/api/**"],
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
    rules: {
      // A spec that hands a fake fetch a client the client has not been
      // assigned yet — the session-change-mid-request cases — has to declare
      // it with `let` and fill it in below the closure that reads it. It is
      // written once, so prefer-const flags it, and `const` is not available:
      // the closure is an argument to the constructor. Scoped to specs; a
      // production file with this shape should be restructured instead.
      "prefer-const": ["error", { ignoreReadBeforeAssign: true }],
    },
  },
  {
    ignores: ["src/frontend/generated/*", "dist/*"],
  },
]);
