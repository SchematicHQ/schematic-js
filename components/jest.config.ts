import { type Config } from "jest";

export default {
  testEnvironment: "jest-fixed-jsdom",
  transform: {
    "^.+\\.(t|j)sx?$": [
      "@swc/jest",
      {
        jsc: {
          parser: {
            syntax: "typescript",
            tsx: true,
          },
          transform: {
            react: {
              runtime: "automatic",
            },
          },
          keepClassNames: true,
          experimental: {
            plugins: [
              [
                "@swc/plugin-styled-components",
                {
                  displayName: false,
                  ssr: false,
                  minify: false,
                },
              ],
            ],
          },
        },
      },
    ],
  },
  transformIgnorePatterns: [
    "/node_modules/(?!(@schematichq/schematic-icons)/)",
  ],
  setupFilesAfterEnv: ["<rootDir>/jest.env.setup.ts"],
  testMatch: ["<rootDir>/src/**/*.test.(ts|tsx)"],
  extensionsToTreatAsEsm: [".ts", ".tsx"],
} satisfies Config;
