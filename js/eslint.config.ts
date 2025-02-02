import eslint from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import importPlugin from "eslint-plugin-import";

export default tseslint.config({
  extends: [
    eslint.configs.recommended,
    tseslint.configs.recommended,
    importPlugin.flatConfigs.recommended,
  ],
  files: ["**/*.ts"],
  languageOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    globals: {
      ...globals.browser,
      ...globals.node,
    },
    parser: tseslint.parser,
    parserOptions: {
      project: "./tsconfig.json",
    },
  },
  rules: {
    "@typescript-eslint/strict-boolean-expressions": [
      "warn",
      {
        allowString: false,
        allowNumber: false,
      },
    ],
  },
  settings: {
    "import/resolver": {
      typescript: {},
    },
  },
  plugins: {
    "@typescript-eslint": tseslint.plugin,
  },
});
