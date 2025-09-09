/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: "ts-jest/presets/js-with-ts-esm",
  testEnvironment: "jsdom",
  transform: {
    "^.+\\.(ts|tsx)?$": "ts-jest",
  },
  transformIgnorePatterns: [
    "<rootDir>/node_modules/(?!(@schematichq/schematic-icons|uuid))",
  ],
  testMatch: ["<rootDir>/src/**/*.test.(ts|tsx)"],
  moduleDirectories: ["node_modules", "test"],
  setupFilesAfterEnv: ["<rootDir>/src/test/setup.ts"],
};
