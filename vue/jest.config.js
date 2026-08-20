module.exports = {
  preset: "ts-jest",
  testEnvironment: "jsdom",
  testMatch: ["**/*.spec.ts"],
  collectCoverageFrom: ["src/**/*.ts", "!src/**/*.spec.ts"],
  moduleFileExtensions: ["ts", "js"],
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        tsconfig: {
          target: "ES2020",
          module: "commonjs",
          esModuleInterop: true,
          // TypeScript 6 dropped the implicit pull-in of every @types package,
          // so the jest and node globals have to be requested by name.
          types: ["jest", "node"],
        },
      },
    ],
  },
  setupFiles: [],
  setupFilesAfterEnv: [],
};

