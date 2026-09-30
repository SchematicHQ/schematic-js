import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Mock Stripe to prevent network requests that cause EINVAL errors in Node 25.x
vi.mock("@stripe/stripe-js", () => ({
  loadStripe: vi.fn(() =>
    Promise.resolve({
      elements: vi.fn(() => ({
        create: vi.fn(),
        getElement: vi.fn(),
      })),
      confirmSetup: vi.fn(),
      confirmPayment: vi.fn(),
    }),
  ),
}));

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

// jsdom declares HTMLDialogElement but implements none of it. The polyfill
// toggles `open`, fires `close`, and closes the topmost modal on Escape after
// a cancelable `cancel`, which is what a browser does.
if (
  typeof HTMLDialogElement !== "undefined" &&
  typeof HTMLDialogElement.prototype.showModal !== "function"
) {
  const open = function (this: HTMLDialogElement) {
    if (this.open) {
      throw new DOMException(
        "The dialog is already open.",
        "InvalidStateError",
      );
    }
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.show = open;
  HTMLDialogElement.prototype.showModal = open;
  HTMLDialogElement.prototype.close = function (returnValue?: string) {
    if (!this.open) {
      return;
    }
    if (returnValue !== undefined) {
      this.returnValue = returnValue;
    }
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }
    const dialogs =
      document.querySelectorAll<HTMLDialogElement>("dialog[open]");
    const topmost = dialogs[dialogs.length - 1];
    if (
      topmost !== undefined &&
      topmost.dispatchEvent(new Event("cancel", { cancelable: true }))
    ) {
      topmost.close();
    }
  });
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: "warn" });

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
