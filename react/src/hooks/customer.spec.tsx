import { SchematicCustomerClient } from "@schematichq/schematic-js";
import { render, renderHook, screen, waitFor } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import {
  SchematicProvider,
  useCatalog,
  useInvoices,
  useSchematicCustomerClient,
  useSubscription,
} from "../index";
import {
  envelope,
  jsonResponse,
  makeWireHydrate,
  makeWireInvoice,
  makeWirePublicPlans,
} from "./__tests__/fixtures";

function makeFetch(options?: { failFirst?: boolean }) {
  let failed = false;
  const calls: Array<{ url: string; init: RequestInit | undefined }> = [];
  const fetchFn = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, init });
      if (options?.failFirst && !failed) {
        failed = true;
        return jsonResponse({ error: "server error" }, 500);
      }
      if (url.includes("/components/invoices")) {
        return jsonResponse(envelope([makeWireInvoice()]));
      }
      if (url.includes("/components/hydrate")) {
        return jsonResponse(envelope(makeWireHydrate()));
      }
      if (url.includes("/public/plans")) {
        return jsonResponse(envelope(makeWirePublicPlans()));
      }
      return jsonResponse({ error: "not found" }, 404);
    },
  ) as unknown as typeof fetch;
  return { fetchFn, calls };
}

function makeClient(options?: {
  publishableKey?: string;
  withToken?: boolean;
  failFirst?: boolean;
}) {
  const { fetchFn, calls } = makeFetch(options);
  const client = new SchematicCustomerClient({
    publishableKey: options?.publishableKey,
    getAccessToken:
      options?.withToken === false ? undefined : async () => "token_x",
    fetchFn,
  });
  return { client, fetchFn, calls };
}

describe("useSubscription", () => {
  it("transitions from pending to data", async () => {
    const { client } = makeClient();
    const { result } = renderHook(() => useSubscription({ client }));

    expect(result.current.isPending).toBe(true);
    expect(result.current.data).toBeUndefined();

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.error).toBeUndefined();
    expect(result.current.data?.displaySettings.showCredits).toBe(true);
    expect(result.current.data?.features).toEqual([]);
  });

  it("recovers from an error via refetch", async () => {
    const { client } = makeClient({ failFirst: true });
    const { result } = renderHook(() => useSubscription({ client }));

    await waitFor(() => expect(result.current.error).toBeDefined());

    await result.current.refetch();
    await waitFor(() => {
      expect(result.current.error).toBeUndefined();
      expect(result.current.data).toBeDefined();
    });
  });

  it("reports a descriptive error on a public-only client instead of throwing", async () => {
    const { client } = makeClient({
      publishableKey: "api_pub",
      withToken: false,
    });
    const { result } = renderHook(() => useSubscription({ client }));

    await waitFor(() => expect(result.current.error).toBeDefined());
    expect(result.current.error?.message).toMatch(/getAccessToken/);
    expect(result.current.data).toBeUndefined();
  });
});

describe("useCatalog", () => {
  it("uses the public catalog in public mode", async () => {
    const { client } = makeClient({
      publishableKey: "api_pub",
      withToken: false,
    });
    const { result } = renderHook(() => useCatalog({ client }));

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.mode).toBe("public");
    expect(result.current.data?.plans[0].current).toBeUndefined();
  });

  it("auto mode prefers company context when a token is available", async () => {
    const { client } = makeClient({ publishableKey: "api_pub" });
    const { result } = renderHook(() => useCatalog({ client }));

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.mode).toBe("company");
    expect(result.current.data?.plans[0].current).toBe(true);
  });

  it("shares one hydrate fetch with useSubscription", async () => {
    const { client, fetchFn } = makeClient();
    const subscription = renderHook(() => useSubscription({ client }));
    const catalog = renderHook(() => useCatalog({ client, mode: "company" }));

    await waitFor(() => {
      expect(subscription.result.current.data).toBeDefined();
      expect(catalog.result.current.data).toBeDefined();
    });

    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});

describe("useInvoices", () => {
  it("fetches the invoice list", async () => {
    const { client } = makeClient();
    const { result } = renderHook(() => useInvoices({ client, limit: 5 }));

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].amountDue).toBe(1000);
  });

  it("keeps a stable resource across rerenders with equivalent options", async () => {
    const { client, fetchFn } = makeClient();
    const { result, rerender } = renderHook(() =>
      useInvoices({ client, limit: 5 }),
    );

    await waitFor(() => expect(result.current.data).toBeDefined());
    rerender();
    rerender();
    // hydrate is untouched; only one invoices call despite fresh options objects
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});

describe("provider integration", () => {
  it("resolves the client from SchematicProvider context", async () => {
    const { client } = makeClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SchematicProvider publishableKey="api_pub" customerClient={client}>
        {children}
      </SchematicProvider>
    );

    const { result } = renderHook(() => useSubscription(), { wrapper });
    await waitFor(() => expect(result.current.data).toBeDefined());
  });

  it("an explicit client wins over the provider's", async () => {
    const { client: providerClient } = makeClient();
    const { client: explicitClient, fetchFn } = makeClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SchematicProvider
        publishableKey="api_pub"
        customerClient={providerClient}
      >
        {children}
      </SchematicProvider>
    );

    const { result } = renderHook(
      () => useSubscription({ client: explicitClient }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(fetchFn).toHaveBeenCalled();
  });

  it("throws a descriptive error without a provider or explicit client", () => {
    expect(() => renderHook(() => useSchematicCustomerClient())).toThrow(
      /SchematicProvider|client/,
    );
  });

  it("handles token-mode transitions: same-commit mount on arrival, no crash on clear", async () => {
    const { fetchFn } = makeFetch();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchFn;
    try {
      const CatalogProbe = () => {
        const catalog = useCatalog();
        return <div data-testid="mode">{catalog.data?.mode ?? "pending"}</div>;
      };
      const BillingProbe = () => {
        const subscription = useSubscription();
        return (
          <div data-testid="billing">
            {subscription.data !== undefined ? "loaded" : "pending"}
          </div>
        );
      };
      // The natural consumer shape: the token prop and the billing UI that
      // needs it arrive in the same render commit
      const Screen = ({ token }: { token?: string }) => (
        <SchematicProvider publishableKey="api_pub" accessToken={token}>
          <CatalogProbe />
          {token !== undefined ? <BillingProbe /> : null}
        </SchematicProvider>
      );

      const { rerender } = render(<Screen />);
      await waitFor(() =>
        expect(screen.getByTestId("mode").textContent).toBe("public"),
      );

      // Token arrives: billing mounts in the same commit and must not throw;
      // auto-mode catalog must flip to company context
      rerender(<Screen token="token_x" />);
      await waitFor(() => {
        expect(screen.getByTestId("billing").textContent).toBe("loaded");
        expect(screen.getByTestId("mode").textContent).toBe("company");
      });

      // Logout: billing unmounts in the same commit; the catalog returns to
      // public mode without anything crashing
      rerender(<Screen />);
      await waitFor(() =>
        expect(screen.getByTestId("mode").textContent).toBe("public"),
      );
      expect(screen.queryByTestId("billing")).toBeNull();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("reports an error, not a crash, when the token clears under a mounted hook", async () => {
    const { fetchFn } = makeFetch();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchFn;
    try {
      // Unlike the transition test above, the billing UI stays mounted across
      // the logout — the common case when the consumer does not gate it on the
      // token. That must surface through `error`, not throw out of render.
      const BillingProbe = () => {
        const subscription = useSubscription();
        return (
          <div data-testid="billing">
            {subscription.error?.message ??
              (subscription.data !== undefined ? "loaded" : "pending")}
          </div>
        );
      };
      const Screen = ({ token }: { token?: string }) => (
        <SchematicProvider publishableKey="api_pub" accessToken={token}>
          <BillingProbe />
        </SchematicProvider>
      );

      const { rerender } = render(<Screen token="token_x" />);
      await waitFor(() =>
        expect(screen.getByTestId("billing").textContent).toBe("loaded"),
      );

      rerender(<Screen />);
      await waitFor(() =>
        expect(screen.getByTestId("billing").textContent).toMatch(
          /getAccessToken/,
        ),
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("tolerates empty-string credentials instead of throwing during render", async () => {
    // `process.env.KEY ?? ""` and `session?.token ?? ""` are the idiomatic
    // ways to keep these props typed as string; neither means "authenticate
    // with the empty string".
    expect(() =>
      render(
        <SchematicProvider publishableKey="" accessToken="">
          <div data-testid="child">ok</div>
        </SchematicProvider>,
      ),
    ).not.toThrow();
    expect(screen.getByTestId("child").textContent).toBe("ok");

    const { fetchFn } = makeFetch();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchFn;
    try {
      // An empty accessToken alongside a real key leaves the client in public
      // mode rather than failing construction
      const Probe = () => {
        const catalog = useCatalog();
        return <div data-testid="mode">{catalog.data?.mode ?? "pending"}</div>;
      };
      render(
        <SchematicProvider publishableKey="api_pub" accessToken="">
          <Probe />
        </SchematicProvider>,
      );
      await waitFor(() =>
        expect(screen.getByTestId("mode").textContent).toBe("public"),
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("does not wipe company data when an inline accessToken function is re-created", async () => {
    const { fetchFn, calls } = makeFetch();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchFn;
    try {
      // The shape a consumer writes without memoizing: a new closure identity
      // every render, yielding the same token
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SchematicProvider
          publishableKey="api_pub"
          accessToken={async () => "token_x"}
        >
          {children}
        </SchematicProvider>
      );

      const { result, rerender } = renderHook(() => useSubscription(), {
        wrapper,
      });
      await waitFor(() => expect(result.current.data).toBeDefined());
      const hydrateCalls = () =>
        calls.filter((c) => c.url.includes("/components/hydrate"));
      expect(hydrateCalls()).toHaveLength(1);

      rerender();
      rerender();
      rerender();

      // Same credential, so nothing is dropped and nothing is refetched
      await waitFor(() => expect(hydrateCalls()).toHaveLength(1));
      expect(result.current.data).toBeDefined();
      expect(result.current.isPending).toBe(false);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("swaps the token and refetches when the accessToken prop changes", async () => {
    // The provider constructs its own client against the real fetch, so
    // intercept globally for this test
    const { fetchFn, calls } = makeFetch();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchFn;
    try {
      let accessToken = "token_company_a";
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SchematicProvider publishableKey="api_pub" accessToken={accessToken}>
          {children}
        </SchematicProvider>
      );

      const { result, rerender } = renderHook(() => useSubscription(), {
        wrapper,
      });
      await waitFor(() => expect(result.current.data).toBeDefined());
      const hydrateCalls = () =>
        calls.filter((c) => c.url.includes("/components/hydrate"));
      let headers = hydrateCalls()[0].init?.headers as Record<string, string>;
      expect(headers["X-Schematic-Api-Key"]).toBe("token_company_a");
      expect(headers["X-Schematic-Client-Version"]).toMatch(
        /^schematic-react@/,
      );

      // Company switch: the provider swaps the token on the client, which
      // drops company-scoped data; the mounted hook refetches under the new
      // credential
      accessToken = "token_company_b";
      rerender();
      await waitFor(() => {
        const latest = hydrateCalls();
        headers = latest[latest.length - 1].init?.headers as Record<
          string,
          string
        >;
        expect(headers["X-Schematic-Api-Key"]).toBe("token_company_b");
      });
      await waitFor(() => expect(result.current.data).toBeDefined());
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
