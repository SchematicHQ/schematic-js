import { vi } from "vitest";
import React from "react";
import { act, render, renderHook } from "@testing-library/react";
import { Schematic, type CreditBalances } from "@schematichq/schematic-js";
import {
  SchematicProvider,
  useSchematicCreditBalance,
  useSchematicFlag,
} from "./index";

const mockFetch = vi.fn();
globalThis.fetch = mockFetch as typeof fetch;

// Check if we're in a DOM environment
const isDOMEnvironment = typeof document !== "undefined";

describe("schematic-react", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it("should export SchematicProvider", () => {
    expect(SchematicProvider).toBeDefined();
  });

  it("should export useSchematicFlag hook", () => {
    expect(useSchematicFlag).toBeDefined();
  });

  (isDOMEnvironment ? it : it.skip)(
    "should render SchematicProvider with children",
    () => {
      const { container } = render(
        <SchematicProvider publishableKey="test-key">
          <div>Hello World</div>
        </SchematicProvider>,
      );

      expect(container.textContent).toBe("Hello World");
    },
  );

  (isDOMEnvironment ? it : it.skip)(
    "should accept a pre-configured client",
    () => {
      const client = new Schematic("test-key");
      const { container } = render(
        <SchematicProvider client={client}>
          <div>Hello World</div>
        </SchematicProvider>,
      );

      expect(container.textContent).toBe("Hello World");
    },
  );

  it("should create Schematic client instance", () => {
    const client = new Schematic("test-key");
    expect(client).toBeDefined();
    expect(typeof client.checkFlag).toBe("function");
    expect(typeof client.track).toBe("function");
    expect(typeof client.identify).toBe("function");
  });

  it("should export useSchematicCreditBalance hook", () => {
    expect(useSchematicCreditBalance).toBeDefined();
  });
});

// A minimal controllable client that satisfies the methods the credit balance
// hook reads, so we can drive DataStream-style updates without websockets.
const createFakeClient = () => {
  let balances: CreditBalances = {};
  let isPending = true;
  const balanceListeners = new Set<() => void>();
  const pendingListeners = new Set<() => void>();

  return {
    getCreditBalance: (creditId: string) => balances[creditId],
    getCreditBalances: () => balances,
    addCreditBalanceListener: (cb: () => void) => {
      balanceListeners.add(cb);
      return () => balanceListeners.delete(cb);
    },
    getIsPending: () => isPending,
    addIsPendingListener: (cb: () => void) => {
      pendingListeners.add(cb);
      return () => pendingListeners.delete(cb);
    },
    // test-only helpers
    __emitBalances: (next: CreditBalances) => {
      balances = next;
      balanceListeners.forEach((cb) => cb());
    },
    __setPending: (next: boolean) => {
      isPending = next;
      pendingListeners.forEach((cb) => cb());
    },
  };
};

(isDOMEnvironment ? describe : describe.skip)(
  "useSchematicCreditBalance",
  () => {
    const renderBalance = (
      creditId: string,
      client: ReturnType<typeof createFakeClient>,
      opts?: { type?: "settled" | "remaining" | "reserved" },
    ) =>
      renderHook(() => useSchematicCreditBalance(creditId, opts), {
        wrapper: ({ children }: { children: React.ReactNode }) => (
          <SchematicProvider client={client as unknown as Schematic}>
            {children}
          </SchematicProvider>
        ),
      });

    it("reports isLoading until a balance is available", () => {
      const client = createFakeClient();
      const { result } = renderBalance("credit-abc", client);

      expect(result.current).toEqual({ balance: 0, isLoading: true });
    });

    it("surfaces settled as the default headline balance", () => {
      // Repro from SCH-6526: 6000 grant, lease tracked to 2558. The streamed
      // `remaining` froze at 0 mid-lease; `settled` (spendable) is 3442 — and
      // that's the default the hook returns.
      const client = createFakeClient();
      const { result } = renderBalance("credit-abc", client);

      act(() => {
        client.__setPending(false);
        client.__emitBalances({
          "credit-abc": { remaining: 0, reserved: 3442, settled: 3442 },
        });
      });

      expect(result.current).toEqual({ balance: 3442, isLoading: false });
    });

    it("surfaces remaining/reserved when requested via opts.type", () => {
      const client = createFakeClient();
      const remainingHook = renderBalance("credit-abc", client, {
        type: "remaining",
      });
      const reservedHook = renderBalance("credit-abc", client, {
        type: "reserved",
      });

      act(() => {
        client.__setPending(false);
        client.__emitBalances({
          "credit-abc": { remaining: 0, reserved: 3442, settled: 3442 },
        });
      });

      expect(remainingHook.result.current.balance).toBe(0);
      expect(reservedHook.result.current.balance).toBe(3442);
    });

    it("re-renders as credit balance partials arrive", () => {
      const client = createFakeClient();
      const { result } = renderBalance("credit-abc", client);

      act(() => {
        client.__setPending(false);
        client.__emitBalances({
          "credit-abc": { remaining: 3442, reserved: 0, settled: 3442 },
        });
      });
      expect(result.current.balance).toBe(3442);

      // A credit_reserved partial arrives: a lease opens holding 3442. settled
      // stays 3442, so the headline number does not falsely drop.
      act(() => {
        client.__emitBalances({
          "credit-abc": { remaining: 0, reserved: 3442, settled: 3442 },
        });
      });
      expect(result.current.balance).toBe(3442);
    });

    it("returns 0 (not loading) for an unknown credit once loaded", () => {
      const client = createFakeClient();
      const { result } = renderBalance("credit-missing", client);

      act(() => {
        client.__setPending(false);
        client.__emitBalances({
          "credit-abc": { remaining: 1, reserved: 0, settled: 1 },
        });
      });

      expect(result.current).toEqual({ balance: 0, isLoading: false });
    });
  },
);
