import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Mock localStorage for Node v25 compatibility BEFORE importing MSW
const mockStorage: Storage = {
  length: 0,
  clear: vi.fn(),
  getItem: vi.fn((key: string) => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  key: vi.fn((index: number) => null),
};

Object.defineProperty(globalThis, "localStorage", {
  value: mockStorage,
  writable: true,
});

import { server } from "./src/test/mocks/node";

beforeAll(() => {
  server.listen();

  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
