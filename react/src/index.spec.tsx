import { Schematic, type CreditBalances } from "@schematichq/schematic-js";
import { act, render, renderHook, waitFor } from "@testing-library/react";
import React, { useContext } from "react";
import { vi } from "vitest";

import { SchematicContext } from "./context";
// The raw (non-lazy) adapter. The `WsAdapter` exported from `./index` is a
// `React.lazy`-wrapped ref that mounts asynchronously; for the synchronous
// lifecycle assertions below we bind the raw component directly via
// `ws={RawWsAdapter}` so it mounts (and constructs the client) on first render.
import { WsAdapter as RawWsAdapter } from "./core/WsAdapter";

import {
  SchematicProvider,
  useSchematic,
  useSchematicCreditBalance,
  useSchematicFlag,
} from "./index";

const mockFetch = vi.fn();
globalThis.fetch = mockFetch as typeof fetch;

const isDOMEnvironment = typeof document !== "undefined";

describe("schematic-react (root entry / core)", () => {
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
    ) =>
      renderHook(() => useSchematicCreditBalance(creditId), {
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

    it("surfaces the settled (spendable) balance", () => {
      // Repro from SCH-6526: 6000 grant, lease tracked to 2558. The streamed
      // `remaining` froze at 0 mid-lease; `settled` (spendable) is 3442 — and
      // that's what the hook returns.
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

(isDOMEnvironment ? describe : describe.skip)("WsAdapter lifecycle", () => {
  it("calls client.cleanup on unmount when no client prop is passed", async () => {
    // `cleanup` is an instance field (arrow function), so we have to spy
    // on the instance the WsAdapter constructs internally. The probe
    // reads it out of context.
    let captured: Schematic | null = null;
    const Probe = () => {
      captured = useContext(SchematicContext).client;
      return null;
    };

    const { unmount } = render(
      <SchematicProvider publishableKey="test-key" ws={RawWsAdapter}>
        <Probe />
      </SchematicProvider>,
    );

    expect(captured).not.toBeNull();
    const cleanupSpy = vi
      .spyOn(captured as unknown as Schematic, "cleanup")
      .mockResolvedValue();

    unmount();

    expect(cleanupSpy).toHaveBeenCalledTimes(1);
  });

  it("does NOT call cleanup on unmount when a `client` prop is provided", async () => {
    const client = new Schematic("test-key");
    const cleanupSpy = vi.spyOn(client, "cleanup").mockResolvedValue(undefined);

    const { unmount } = render(
      <SchematicProvider client={client} ws={RawWsAdapter}>
        <div>x</div>
      </SchematicProvider>,
    );

    unmount();

    expect(cleanupSpy).not.toHaveBeenCalled();
  });

  it("warns in dev when publishableKey changes after mount", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { rerender } = render(
      <SchematicProvider publishableKey="key-1" ws={RawWsAdapter}>
        <div>x</div>
      </SchematicProvider>,
    );

    await act(async () => {
      rerender(
        <SchematicProvider publishableKey="key-2" ws={RawWsAdapter}>
          <div>x</div>
        </SchematicProvider>,
      );
    });

    expect(warnSpy).toHaveBeenCalled();
    const message = warnSpy.mock.calls[0]?.[0];
    expect(String(message)).toMatch(/publishableKey changed after mount/i);

    warnSpy.mockRestore();
  });

  it("ws={null} mounts no client; useSchematic throws a clear disabled error", () => {
    const errors: string[] = [];
    const Probe = () => {
      try {
        useSchematic();
        errors.push("no-throw");
      } catch (err) {
        errors.push((err as Error).message);
      }
      return null;
    };

    // Suppress React's error logging for the deliberate throw.
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <SchematicProvider ws={null}>
        <Probe />
      </SchematicProvider>,
    );

    expect(errors[0]).toMatch(/ws=\{null\}/);
    expect(errors[0]).toMatch(/disabled/i);
    errSpy.mockRestore();
  });

  it("lazy-loads the WS adapter on first core-hook use (default ws)", async () => {
    // No `ws` prop → the adapter is lazy. The client is absent on first
    // render; `useSchematicFlag` triggers the dynamic import from an effect
    // (returning its fallback meanwhile), and once the chunk loads the
    // provider re-renders with the adapter mounted and the client populated.
    let captured: Schematic | null = null;
    let flagValue: boolean | undefined;
    const Probe = () => {
      flagValue = useSchematicFlag("some-flag", { fallback: false });
      captured = useContext(SchematicContext).client;
      return null;
    };

    render(
      <SchematicProvider publishableKey="test-key">
        <Probe />
      </SchematicProvider>,
    );

    // First paint: no Suspense flash, fallback returned, client not yet bound.
    expect(flagValue).toBe(false);
    expect(captured).toBeNull();

    // After the dynamic import resolves and the adapter mounts.
    await waitFor(() => expect(captured).not.toBeNull());
  });
});
