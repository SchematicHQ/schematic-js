import js from "@eslint/js";
import json from "@eslint/json";
import markdown from "@eslint/markdown";
import { defineConfig, globalIgnores } from "eslint/config";
import { importX } from "eslint-plugin-import-x";
import pluginReact from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores(["**/api/", "**/mockServiceWorker.js", "dist/"]),
  {
    files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"],
    plugins: { js, pluginReact },
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      importX.flatConfigs.recommended,
      importX.flatConfigs.typescript,
      pluginReact.configs.flat.recommended,
      pluginReact.configs.flat["jsx-runtime"],
      reactHooks.configs.flat["recommended-latest"],
    ],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: globals.browser,
    },
    rules: {
      "@typescript-eslint/no-empty-function": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { ignoreRestSiblings: true, argsIgnorePattern: "^_" },
      ],
      "react/no-unescaped-entities": "off",
      "import-x/first": "error",
      "import-x/newline-after-import": "error",
      "import-x/no-duplicates": "error",
      "import-x/no-named-as-default": "off",
      "import-x/order": [
        "error",
        {
          "newlines-between": "always",
          "alphabetize": {
            order: "asc",
            orderImportKind: "asc",
          },
          "named": {
            enabled: true,
            types: "types-last",
          },
        },
      ],
    },
    settings: {
      "import-x/extensions": [".ts", ".tsx"],
      "import-x/resolver": {
        typescript: true,
      },
      "react": {
        version: "19",
      },
    },
  },
  {
    // The headless headless layer must stay free of styled-components,
    // Stripe, i18next, icons, and the styled UI subtrees — that's what keeps
    // the `/headless` bundle lightweight (a compile-time analog of
    // `scripts/check-tree-shake.mjs`).
    files: ["src/headless/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            "styled-components",
            "i18next",
            "react-i18next",
            "@stripe/react-stripe-js",
            "@stripe/stripe-js",
            "@schematichq/schematic-icons",
          ],
          patterns: [
            "**/components/components/ui/**",
            "**/components/components/ui",
            "**/components/components/layout/**",
            "**/components/components/layout",
            "**/components/components/shared/**",
            "**/components/components/shared",
          ],
        },
      ],
    },
  },
  {
    files: ["**/*.json"],
    plugins: { json },
    language: "json/json",
    extends: ["json/recommended"],
  },
  {
    files: ["**/*.md"],
    plugins: { markdown },
    language: "markdown/gfm",
    extends: ["markdown/recommended"],
  },
]);
