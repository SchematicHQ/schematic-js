module.exports = {
  env: {
    browser: true,
    es2020: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react-hooks/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  plugins: ["import"],
  rules: {
    "@typescript-eslint/no-empty-function": "off",
    "@typescript-eslint/no-unused-vars": [
      "error",
      { ignoreRestSiblings: true },
    ],
  },
};
