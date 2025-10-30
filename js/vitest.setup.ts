import { WebSocket } from "mock-socket";
import { vi } from "vitest";

// Set up global WebSocket mock
globalThis.WebSocket = WebSocket as typeof globalThis.WebSocket;

// Mock localStorage for Node v25 compatibility
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
