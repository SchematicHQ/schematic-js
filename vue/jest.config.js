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
        },
      },
    ],
  },
  setupFiles: [],
  setupFilesAfterEnv: [],
};

