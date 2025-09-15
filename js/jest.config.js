/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest/presets/js-with-ts-esm",
  testEnvironment: "jsdom",
  transform: {
    "^.+\\.(ts|tsx)?$": "ts-jest",
  },
  transformIgnorePatterns: ["<rootDir/node_modules/uuid"],
  testMatch: ["<rootDir>/src/**/*.spec.ts"],
};

global.WebSocket = require("mock-socket").WebSocket;
