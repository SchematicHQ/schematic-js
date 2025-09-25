/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: "ts-jest/presets/js-with-ts-esm",
  testEnvironment: "jsdom",
  transform: {
    "^.+\\.(ts|tsx)?$": "ts-jest",
  },
  testMatch: ["<rootDir>/src/**/*.spec.ts", "<rootDir>/src/**/*.test.ts", "<rootDir>/src/**/*.test.tsx"],
};
