import {
  Schematic,
  SchematicBillingClient,
  sessionKey,
} from "@schematichq/schematic-js";
import { act, render, renderHook, screen } from "@testing-library/react";
import React, {
  StrictMode,
  useCallback,
  useMemo,
  useSyncExternalStore,
} from "react";
import { vi } from "vitest";

import { SchematicProvider } from "../context";

import { BillingStore, type BillingClient, type SessionEvent } from "./client";
import {
  BillingDataProvider,
  MISSING_BILLING_SOURCE_MESSAGE,
  useBillingDataSource,
} from "./context";
import {
  normalizeInvoiceQuery,
  type BillingData,
  type Invoice,
  type UpcomingInvoice,
} from "./contract";
import { useInvoices, useUpcomingInvoice } from "./hooks";
import { BillingProvider, SESSION_REPLACED_MESSAGE } from "./provider";

const isDOMEnvironment = typeof document !== "undefined";
const it_ = isDOMEnvironment ? it : it.skip;

const flush = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));

const invoice = (id: string) => ({ id }) as unknown as Invoice;
const page = (...ids: string[]): BillingData["invoices"] => ({
  invoices: ids.map(invoice),
  count: ids.length,
  hasMore: false,
});

const rowsOf = (...ids: string[]) => ({
  invoices: ids.map(invoice),
  count: ids.length,
});

/** A fake server over `rows`, paging them the way the API does. */
const serve =
  (rows: Invoice[]) =>
  async ({ limit, offset }: { limit: number; offset: number }) => ({
    invoices: rows.slice(offset, offset + limit),
    count: rows.length,
  });

const bill = (amountDue: number): UpcomingInvoice => ({
  amountDue,
  currency: "usd",
  customerBalanceApplied: 0,
  customerBalanceRemaining: 0,
  discounts: [],
  subtotal: amountDue,
});

type SessionListener = (event: SessionEvent) => void;

function fakeClient(overrides: Partial<BillingClient> = {}): BillingClient & {
  listeners: SessionListener[];
} {
  const listeners: SessionListener[] = [];
  return {
    listeners,
    sessionStatus: "active",
    sessionKey: undefined,
    fetchInvoices: vi.fn(async () => rowsOf()),
    fetchUpcomingInvoice: vi.fn(async () => null),
    onSessionChange: (listener) => {
      listeners.push(listener);
      return () => {};
    },
    setSession: vi.fn(),
    ...overrides,
  };
}

describe("billing hooks", () => {
  it_("report the missing-source error outside any provider", () => {
    const { result } = renderHook(() => useInvoices());
    expect(result.current.error?.message).toBe(MISSING_BILLING_SOURCE_MESSAGE);
    expect(result.current.isPending).toBe(false);
  });

  it_("load through the client and expose refetch", async () => {
    const client = fakeClient({
      fetchInvoices: vi.fn(async () => rowsOf("inv_1")),
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BillingProvider billingClient={client}>{children}</BillingProvider>
    );
    const { result } = renderHook(() => useInvoices(), { wrapper });
    expect(result.current.isPending).toBe(true);
    await flush();
    expect(result.current.data?.invoices).toHaveLength(1);
    expect(client.fetchInvoices).toHaveBeenCalledTimes(1);
    act(() => result.current.refetch());
    await flush();
    expect(client.fetchInvoices).toHaveBeenCalledTimes(2);
  });

  it_(
    "serve initialData without a request and keep live data on later props",
    async () => {
      const client = fakeClient();
      const initialData: BillingData = { invoices: page("inv_1") };
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <BillingProvider billingClient={client} initialData={initialData}>
          {children}
        </BillingProvider>
      );
      const { result } = renderHook(() => useInvoices(), { wrapper });
      expect(result.current).toMatchObject({ isPending: false });
      expect(result.current.data?.invoices).toHaveLength(1);
      await flush();
      expect(client.fetchInvoices).not.toHaveBeenCalled();
    },
  );

  it_("serve initialData with no client at all (static page)", () => {
    const { result } = renderHook(() => useInvoices(), {
      wrapper: ({ children }) => (
        <BillingProvider initialData={{ invoices: page("inv_1") }}>
          {children}
        </BillingProvider>
      ),
    });
    expect(result.current.data?.invoices).toHaveLength(1);
  });

  it_("treat an explicitly-default query as the default one", async () => {
    // `{ includePending: false }` states the default rather than omitting it.
    // Keyed literally it would be a second row set: missing the prefetch seed
    // and refetching rows already loaded.
    const client = fakeClient({
      fetchInvoices: vi.fn(async () => rowsOf("inv_1")),
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BillingProvider
        billingClient={client}
        initialData={{ invoices: page("inv_seed") }}
      >
        {children}
      </BillingProvider>
    );
    const { result } = renderHook(
      () => useInvoices({ includePending: false }),
      { wrapper },
    );
    await flush();
    expect(result.current.data?.invoices.map((row) => row.id)).toEqual([
      "inv_seed",
    ]);
    expect(client.fetchInvoices).not.toHaveBeenCalled();
  });

  it_(
    "page invoices against the server count and append on loadMore",
    async () => {
      const rows = Array.from({ length: 30 }, (_, i) => invoice(`inv_${i}`));
      const client = fakeClient({ fetchInvoices: vi.fn(serve(rows)) });
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <BillingProvider billingClient={client}>{children}</BillingProvider>
      );
      const { result } = renderHook(() => useInvoices(), { wrapper });
      await flush();
      expect(client.fetchInvoices).toHaveBeenCalledWith({
        limit: 12,
        offset: 0,
      });
      expect(client.fetchInvoices).toHaveBeenCalledTimes(1);
      // The count is of the whole history, not of the rows loaded, so a
      // caller can tell how many invoices stand behind the twelve it has.
      expect(result.current.data).toMatchObject({ count: 30, hasMore: true });
      expect(result.current.data?.invoices).toHaveLength(12);
      act(() => void result.current.loadMore());
      await flush();
      expect(client.fetchInvoices).toHaveBeenLastCalledWith({
        limit: 12,
        offset: 12,
      });
      expect(result.current.data?.invoices).toHaveLength(24);
      act(() => void result.current.loadMore());
      await flush();
      expect(result.current.data).toMatchObject({ hasMore: false });
      expect(result.current.data?.invoices).toHaveLength(30);
    },
  );

  it_("report a failed page and keep the rows already fetched", async () => {
    const rows = Array.from({ length: 30 }, (_, i) => invoice(`inv_${i}`));
    let fail = false;
    const client = fakeClient({
      fetchInvoices: vi.fn(
        async (params: { limit: number; offset: number }) => {
          if (fail) throw new Error("network down");
          return serve(rows)(params);
        },
      ),
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BillingProvider billingClient={client}>{children}</BillingProvider>
    );
    const { result } = renderHook(() => useInvoices(), { wrapper });
    await flush();

    fail = true;
    await act(async () => {
      // Never rejects: the failure lands on the handle, not on the caller.
      await expect(result.current.loadMore()).resolves.toBeUndefined();
    });
    expect(result.current.error).toEqual(new Error("network down"));
    expect(result.current.data?.invoices).toHaveLength(12);
    expect(result.current.isPending).toBe(false);

    fail = false;
    act(() => void result.current.loadMore());
    await flush();
    expect(result.current.error).toBeUndefined();
    expect(result.current.data?.invoices).toHaveLength(24);
  });

  it_("read as pending while a page is on the wire", async () => {
    const rows = Array.from({ length: 30 }, (_, i) => invoice(`inv_${i}`));
    let release: (() => void) | undefined;
    const client = fakeClient({
      fetchInvoices: vi.fn(async ({ limit, offset }) => {
        const answer = {
          invoices: rows.slice(offset, offset + limit),
          count: rows.length,
        };
        if (offset === 0) return answer;
        return new Promise<typeof answer>((resolve) => {
          release = () => resolve(answer);
        });
      }),
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BillingProvider billingClient={client}>{children}</BillingProvider>
    );
    const { result } = renderHook(() => useInvoices(), { wrapper });
    await flush();
    expect(result.current.isPending).toBe(false);

    act(() => void result.current.loadMore());
    await flush();
    expect(result.current.isPending).toBe(true);
    expect(result.current.data?.invoices).toHaveLength(12);

    // A second call while the first page is in flight is not a second request.
    act(() => void result.current.loadMore());
    expect(client.fetchInvoices).toHaveBeenCalledTimes(2);

    await act(async () => {
      release?.();
      await flush();
    });
    expect(result.current.isPending).toBe(false);
    expect(result.current.data?.invoices).toHaveLength(24);
  });

  it_(
    "key the invoices list by query and refetch the loaded window",
    async () => {
      const rows = Array.from({ length: 30 }, (_, i) => invoice(`inv_${i}`));
      const client = fakeClient({ fetchInvoices: vi.fn(serve(rows)) });
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <BillingProvider billingClient={client}>{children}</BillingProvider>
      );
      const { result, rerender } = renderHook(
        ({ includePending }: { includePending?: boolean }) =>
          useInvoices({ includePending }),
        { wrapper, initialProps: {} },
      );
      await flush();
      act(() => void result.current.loadMore());
      await flush();
      expect(result.current.data?.invoices).toHaveLength(24);

      // A different query is a different list, fetched from offset 0.
      rerender({ includePending: true });
      expect(result.current).toMatchObject({
        data: undefined,
        isPending: true,
      });
      await flush();
      expect(client.fetchInvoices).toHaveBeenLastCalledWith({
        includePending: true,
        limit: 12,
        offset: 0,
      });
      expect(result.current.data?.invoices).toHaveLength(12);

      // Back to the first query: its list is still there, and a refetch
      // re-requests the whole loaded window, not just page one.
      rerender({});
      expect(result.current.data?.invoices).toHaveLength(24);
      act(() => result.current.refetch());
      await flush();
      expect(client.fetchInvoices).toHaveBeenLastCalledWith({
        limit: 24,
        offset: 0,
      });
      expect(result.current.data?.invoices).toHaveLength(24);
    },
  );

  it_(
    "stays empty for an element that mounts after the session ended",
    async () => {
      // The resource live at sign-out is not the only one: a subscriber
      // arriving afterwards gets one that has never loaded, and it must not
      // fetch its way into recording the client's refusal as an error.
      const client = fakeClient({
        fetchInvoices: vi.fn(async () => rowsOf("inv_1")),
      });
      Object.defineProperty(client, "sessionStatus", { get: () => "ended" });
      const { result } = renderHook(() => useInvoices(), {
        wrapper: ({ children }: { children: React.ReactNode }) => (
          <BillingProvider billingClient={client}>{children}</BillingProvider>
        ),
      });
      await flush();
      expect(result.current).toMatchObject({
        data: undefined,
        error: undefined,
        isPending: false,
      });
      expect(client.fetchInvoices).not.toHaveBeenCalled();
    },
  );

  it_("states the session before a child's first request", async () => {
    // A child's subscription effect runs before this component's, so a
    // session stated from an effect would arrive one failed fetch too late.
    const order: string[] = [];
    const client = fakeClient({
      setSession: vi.fn(() => {
        order.push("session");
      }),
      fetchInvoices: vi.fn(async () => {
        order.push("fetch");
        return rowsOf();
      }),
    });
    renderHook(() => useInvoices(), {
      wrapper: ({ children }) => (
        <BillingProvider
          billingClient={client}
          session={{ company: "company_a", token: "t1" }}
        >
          {children}
        </BillingProvider>
      ),
    });
    await flush();
    expect(order[0]).toBe("session");
  });

  it_("does not reset a listening store from inside a render", async () => {
    // The render-phase statement is only safe on a client nothing is
    // listening to yet. A later one goes through an effect, or the store's
    // reset would update every subscriber mid-render.
    const client = fakeClient({
      fetchInvoices: vi.fn(async () => rowsOf("inv_1")),
    });
    const Reader = () => {
      const { data } = useInvoices();
      return <span>{data?.invoices.length ?? 0}</span>;
    };
    const at = (company: string) => (
      <BillingProvider billingClient={client} session={{ company, token: "t" }}>
        <Reader />
      </BillingProvider>
    );
    const view = render(at("company_a"));
    await flush();

    const warn = vi.spyOn(console, "error").mockImplementation(() => {});
    view.rerender(at("company_b"));
    await flush();
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
    expect(client.setSession).toHaveBeenCalledWith({
      company: "company_b",
      user: undefined,
      token: "t",
    });
  });

  it_("keeps listening for session changes under StrictMode", async () => {
    // React runs an effect, its cleanup, then the effect again. A store that
    // subscribed once at construction would be deaf from the cleanup on.
    const client = fakeClient({
      fetchInvoices: vi.fn(async () => rowsOf("inv_1")),
    });
    const { result } = renderHook(() => useInvoices(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <StrictMode>
          <BillingProvider billingClient={client}>{children}</BillingProvider>
        </StrictMode>
      ),
    });
    await flush();
    expect(result.current.data?.invoices).toHaveLength(1);

    act(() => {
      client.listeners.forEach((listener) => listener({ type: "changed" }));
    });
    await flush();
    expect(client.fetchInvoices).toHaveBeenCalledTimes(2);
  });

  it_(
    "leaves a client's own session alone while the host states nothing",
    async () => {
      // A host that built its own client and told it the session itself: this
      // provider has nothing to say, and saying `undefined` says nothing.
      const client = fakeClient({ setSession: vi.fn() });
      render(
        <BillingProvider billingClient={client}>
          <span />
        </BillingProvider>,
      );
      await flush();
      for (const call of (client.setSession as ReturnType<typeof vi.fn>).mock
        .calls) {
        expect(call[0]).toBeUndefined();
      }
    },
  );

  it_("signs out and back in through a real client", async () => {
    // Against the real client rather than a fake: the store, the session
    // events and the credential all have to agree for this to work.
    let fetches = 0;
    const client = new SchematicBillingClient({
      apiUrl: "https://api.test",
      fetch: (async () => {
        fetches += 1;
        return new Response(
          JSON.stringify({ data: { count: 0, invoices: [] }, params: {} }),
          { status: 200 },
        );
      }) as unknown as typeof fetch,
    });
    const Reader = () => {
      const { data, error, isPending } = useInvoices();
      return (
        <span>
          {error ? "error" : isPending ? "pending" : data ? "ok" : "empty"}
        </span>
      );
    };
    const at = (
      session: React.ComponentProps<typeof BillingProvider>["session"],
    ) => (
      <BillingProvider billingClient={client} session={session}>
        <Reader />
      </BillingProvider>
    );

    const view = render(at(undefined));
    await flush();
    expect(view.container.textContent).toBe("pending");
    expect(fetches).toBe(0);

    view.rerender(at({ company: "company_a", token: "t_a" }));
    await flush();
    expect(view.container.textContent).toBe("ok");
    expect(fetches).toBe(1);

    view.rerender(at(null));
    await flush();
    expect(view.container.textContent).toBe("empty");
    expect(fetches).toBe(1);

    view.rerender(at({ company: "company_b", token: "t_b" }));
    await flush();
    expect(view.container.textContent).toBe("ok");
    expect(fetches).toBe(2);
  });

  it_(
    "states the session on the client, and what each state means",
    async () => {
      // The provider's whole job at the data seam: say which company is being
      // read. The client decides what a statement means; this only forwards.
      const client = fakeClient();
      const stated = () =>
        (client.setSession as ReturnType<typeof vi.fn>).mock.calls.map(
          (call) => call[0],
        );

      const view = render(
        <BillingProvider
          billingClient={client}
          session={{ company: "company_a", token: "t_a" }}
        >
          <span />
        </BillingProvider>,
      );
      await flush();
      expect(stated()).toContainEqual({
        company: "company_a",
        user: undefined,
        token: "t_a",
      });

      view.rerender(
        <BillingProvider billingClient={client} session={null}>
          <span />
        </BillingProvider>,
      );
      await flush();
      expect(stated()[stated().length - 1]).toBeNull();

      view.rerender(
        <BillingProvider billingClient={client} session={undefined}>
          <span />
        </BillingProvider>,
      );
      await flush();
      expect(stated()[stated().length - 1]).toBeUndefined();
    },
  );

  it_("hands the client the session as stated, token and all", async () => {
    // A stamp on a token is the host's to write: one added here could only
    // guess which company the host minted for.
    const client = fakeClient();
    const token = async () => ({ token: "t_b", company: "company_b" });
    render(
      <BillingProvider
        billingClient={client}
        session={{ company: "company_a", user: "u", token }}
      >
        <span />
      </BillingProvider>,
    );
    await flush();
    expect(client.setSession).toHaveBeenCalledWith({
      company: "company_a",
      user: "u",
      token,
    });
  });

  it_("does not refetch when only the token closure changes", async () => {
    // Inline `token: async () => …` is a new function every render. The
    // client keeps the newest and treats the pair, not the closure, as the
    // session — so nothing resets, and a later mint calls the newest one.
    const sent: string[] = [];
    const client = new SchematicBillingClient({
      apiUrl: "https://api.test",
      fetch: (async (_url: unknown, init?: RequestInit) => {
        sent.push(
          String(
            (init?.headers as Record<string, string>)["X-Schematic-Api-Key"],
          ),
        );
        return new Response(
          JSON.stringify({ data: { count: 0, invoices: [] }, params: {} }),
          { status: 200 },
        );
      }) as typeof fetch,
    });
    function Probe() {
      const { isPending } = useInvoices();
      return <span>{isPending ? "pending" : "ok"}</span>;
    }
    const at = (token: string) => (
      <BillingProvider
        billingClient={client}
        session={{ company: "company_a", token: async () => token }}
      >
        <Probe />
      </BillingProvider>
    );
    const view = render(at("t1"));
    await flush();
    view.rerender(at("t2"));
    await flush();
    expect(sent).toEqual(["t1"]);
  });

  it_("never caches a token the host minted for another company", async () => {
    // A's mint is slow and the user switches to B before it lands, so it
    // answers with B's token. Kept as A's, switching back would read B's
    // invoices under A.
    const sent: string[] = [];
    const client = new SchematicBillingClient({
      apiUrl: "https://api.test",
      fetch: (async (_url: unknown, init?: RequestInit) => {
        const auth = String(
          (init?.headers as Record<string, string>)["X-Schematic-Api-Key"],
        );
        sent.push(auth);
        return new Response(
          JSON.stringify({
            data: { count: 1, invoices: [{ id: `rows_for_${auth}` }] },
            params: {},
          }),
          { status: 200 },
        );
      }) as typeof fetch,
    });
    let current = "a";
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let mints = 0;
    const token = async () => {
      mints += 1;
      if (mints === 1) await gate;
      return `tok_${current}`;
    };
    function Probe() {
      const { data, isPending } = useInvoices();
      return <span>{isPending ? "pending" : data?.invoices[0]?.id}</span>;
    }
    const at = (company: string) => (
      <BillingProvider billingClient={client} session={{ company, token }}>
        <Probe />
      </BillingProvider>
    );
    const view = render(at("a"));
    await flush();
    current = "b";
    view.rerender(at("b"));
    await flush();
    release();
    await flush();
    await flush();
    expect(view.container.textContent).toBe("rows_for_tok_b");

    current = "a";
    view.rerender(at("a"));
    await flush();
    await flush();
    expect(view.container.textContent).toBe("rows_for_tok_a");
    expect(sent).toEqual(["tok_b", "tok_a"]);
  });

  it_(
    "empties the resource when the session ends, without an error",
    async () => {
      // A session ending empties the resource; it is not a failure and must
      // not read as one.
      let status: "pending" | "active" | "ended" = "active";
      const client = fakeClient({
        fetchInvoices: vi.fn(async () => rowsOf("inv_1")),
      });
      Object.defineProperty(client, "sessionStatus", { get: () => status });
      const { result } = renderHook(() => useInvoices(), {
        wrapper: ({ children }: { children: React.ReactNode }) => (
          <BillingProvider billingClient={client}>{children}</BillingProvider>
        ),
      });
      await flush();
      expect(result.current.data?.invoices).toHaveLength(1);

      status = "ended";
      act(() => {
        client.listeners.forEach((listener) => listener({ type: "ended" }));
      });
      await flush();
      expect(result.current).toMatchObject({
        data: undefined,
        error: undefined,
        isPending: false,
      });
      expect(client.fetchInvoices).toHaveBeenCalledTimes(1);
    },
  );

  it_(
    "refuses a prefetch that names another company at first render",
    async () => {
      // The host knew its session before the store existed — SSR hydration —
      // so nothing is emitted for the store to check later. The seed has to be
      // judged as it goes in.
      const client = fakeClient({
        fetchInvoices: vi.fn(async () => rowsOf("fetched")),
      });
      Object.defineProperty(client, "sessionStatus", { get: () => "active" });
      Object.defineProperty(client, "sessionKey", { get: () => "company_a" });
      const store = new BillingStore(client, {
        invoices: page("seeded"),
        sessionKey: "company_b",
      });
      store.connect();
      store.invoices.get({}).subscribe(() => {});
      await flush();
      expect(store.invoices.get({}).snapshot.data?.invoices[0].id).toBe(
        "fetched",
      );
    },
  );

  it_(
    "serves nothing once the session has ended, prefetch or not",
    async () => {
      const client = fakeClient({
        fetchInvoices: vi.fn(async () => rowsOf("fetched")),
      });
      Object.defineProperty(client, "sessionStatus", { get: () => "ended" });
      const store = new BillingStore(client, {
        invoices: page("seeded"),
        sessionKey: "company_a",
      });
      store.connect();
      store.invoices.get({}).subscribe(() => {});
      await flush();
      expect(store.invoices.get({}).snapshot.data).toBeUndefined();
      expect(client.fetchInvoices).not.toHaveBeenCalled();
    },
  );

  it_("holds a stamped prefetch until the session can be checked", async () => {
    // The stamp names a session; while auth is still pending there is
    // nothing to check it against. Showing the rows on trust would paint one
    // company's invoices for whoever the auth turns out to name, so they
    // wait — and go up without a request once the session says they are its.
    let status: "pending" | "active" | "ended" = "pending";
    let key: string | undefined = undefined;
    const client = fakeClient({
      fetchInvoices: vi.fn(async () => rowsOf("fetched")),
    });
    Object.defineProperty(client, "sessionStatus", { get: () => status });
    Object.defineProperty(client, "sessionKey", { get: () => key });
    const store = new BillingStore(client, {
      invoices: page("seeded"),
      sessionKey: "company_a",
    });
    store.connect();
    store.invoices.get({}).subscribe(() => {});
    await flush();
    expect(store.invoices.get({}).snapshot).toMatchObject({
      data: undefined,
      isPending: true,
    });

    status = "active";
    key = "company_a";
    act(() => {
      client.listeners.forEach((listener) => listener({ type: "started" }));
    });
    await flush();
    expect(store.invoices.get({}).snapshot.data?.invoices[0].id).toBe("seeded");
    expect(client.fetchInvoices).not.toHaveBeenCalled();
  });

  it_(
    "paints a stamped prefetch at render when the provider states the session",
    async () => {
      // SSR hydration under a provider that installs from an effect: the
      // client has not heard the session yet, but the provider knows it, and
      // says so — the rows need not wait for an effect the server never ran.
      const client = fakeClient({
        fetchInvoices: vi.fn(async () => rowsOf("fetched")),
      });
      Object.defineProperty(client, "sessionStatus", { get: () => "pending" });
      Object.defineProperty(client, "sessionKey", { get: () => undefined });
      const store = new BillingStore(
        client,
        {
          invoices: page("seeded"),
          sessionKey: sessionKey({ company: "co_a", token: "t" }),
        },
        { session: { company: "co_a", token: "t" } },
      );
      expect(store.invoices.get({}).snapshot.data?.invoices[0].id).toBe(
        "seeded",
      );

      const other = new BillingStore(
        client,
        {
          invoices: page("seeded"),
          sessionKey: sessionKey({ company: "co_a", token: "t" }),
        },
        { session: { company: "co_b", token: "t" } },
      );
      expect(other.invoices.get({}).snapshot.data).toBeUndefined();
    },
  );

  it_(
    "takes an unstamped prefetch at face value while the session is pending",
    async () => {
      // A host that fetched its own rows and hands them over is vouching for
      // them; nothing names another session, so there is nothing to hold for.
      const client = fakeClient({
        fetchInvoices: vi.fn(async () => rowsOf("fetched")),
      });
      Object.defineProperty(client, "sessionStatus", { get: () => "pending" });
      const store = new BillingStore(client, { invoices: page("seeded") });
      expect(store.invoices.get({}).snapshot.data?.invoices[0].id).toBe(
        "seeded",
      );
    },
  );

  it_("refuses a page while the session is still pending", async () => {
    // A prefetch puts rows on screen before auth has answered, so "load
    // more" is clickable with no session behind it. The page cannot be
    // fetched, and recording the refusal would leave an error sitting on
    // rows that are perfectly good — nothing clears it when the session
    // arrives, because the resource already has data.
    let status: "pending" | "active" | "ended" = "pending";
    const client = fakeClient({
      fetchInvoices: vi.fn(async () => rowsOf("fetched")),
    });
    Object.defineProperty(client, "sessionStatus", { get: () => status });
    const store = new BillingStore(client, {
      invoices: { invoices: [invoice("seeded")], count: 2, hasMore: true },
    });
    store.connect();
    store.invoices.get({}).subscribe(() => {});
    await flush();

    await store.loadMoreInvoices();
    expect(store.invoices.get({}).snapshot).toMatchObject({
      error: undefined,
      isPending: false,
    });
    expect(client.fetchInvoices).not.toHaveBeenCalled();

    // Once the session is real, the same click pages.
    status = "active";
    act(() => {
      client.listeners.forEach((listener) => listener({ type: "started" }));
    });
    await store.loadMoreInvoices();
    await flush();
    expect(
      store.invoices.get({}).snapshot.data?.invoices.map(({ id }) => id),
    ).toEqual(["seeded", "fetched"]);
  });

  it_(
    "retries a resource that failed holding rows, once a session arrives",
    async () => {
      // A failure is not a reason to retry on its own, but a session
      // arriving is: it is what a request that failed for want of one was
      // waiting for, rows on screen or not.
      const client = fakeClient({
        fetchInvoices: vi.fn(async () => rowsOf("inv_1")),
      });
      const { result } = renderHook(() => useInvoices(), {
        wrapper: ({ children }: { children: React.ReactNode }) => (
          <BillingProvider billingClient={client}>{children}</BillingProvider>
        ),
      });
      await flush();
      expect(result.current.data?.invoices[0].id).toBe("inv_1");

      client.fetchInvoices = vi.fn(async () => {
        throw new Error("A session is required to read data.");
      });
      await act(() => {
        result.current.refetch();
        return flush();
      });
      expect(result.current.error?.message).toBe(
        "A session is required to read data.",
      );
      expect(result.current.data?.invoices[0].id).toBe("inv_1");

      client.fetchInvoices = vi.fn(async () => rowsOf("recovered"));
      act(() => {
        client.listeners.forEach((listener) => listener({ type: "started" }));
      });
      await flush();
      expect(result.current.error).toBeUndefined();
      expect(result.current.data?.invoices[0].id).toBe("recovered");
    },
  );

  it_("drops a prefetch that belongs to another session", async () => {
    // A cached page, or a tab that switched company while this one sat
    // there: the rows are somebody else's.
    let status: "pending" | "active" | "ended" = "pending";
    let key: string | undefined = undefined;
    const client = fakeClient({
      fetchInvoices: vi.fn(async () => rowsOf("fetched")),
    });
    Object.defineProperty(client, "sessionStatus", { get: () => status });
    Object.defineProperty(client, "sessionKey", { get: () => key });
    const store = new BillingStore(client, {
      invoices: page("seeded"),
      sessionKey: "company_a",
    });
    store.connect();
    store.invoices.get({}).subscribe(() => {});
    await flush();

    status = "active";
    key = "company_b";
    act(() => {
      client.listeners.forEach((listener) => listener({ type: "started" }));
    });
    await flush();
    expect(store.invoices.get({}).snapshot.data?.invoices[0].id).toBe(
      "fetched",
    );
  });

  it_("installs the session before the first request goes out", async () => {
    // Children subscribe before the provider's effects run. Left to
    // themselves they would fetch under whatever the client held — another
    // session's token, or none — so the store holds them until the
    // provider has said whose data this is.
    const order: string[] = [];
    const client = fakeClient({
      fetchInvoices: vi.fn(async () => {
        order.push("fetch");
        return rowsOf("inv_1");
      }),
      setSession: vi.fn(() => {
        order.push("session");
      }),
    });
    const { result } = renderHook(() => useInvoices(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <BillingProvider
          billingClient={client}
          session={{ company: "co_a", token: "t" }}
        >
          {children}
        </BillingProvider>
      ),
    });
    await flush();
    expect(order[0]).toBe("session");
    expect(order).toContain("fetch");
    expect(result.current.data?.invoices[0].id).toBe("inv_1");
  });

  it_("does not fetch before it is connected", async () => {
    const client = fakeClient({
      fetchInvoices: vi.fn(async () => rowsOf("inv_1")),
    });
    const store = new BillingStore(client);
    store.invoices.get({}).subscribe(() => {});
    await flush();
    expect(client.fetchInvoices).not.toHaveBeenCalled();
    expect(store.invoices.get({}).snapshot.isPending).toBe(true);

    store.connect();
    await flush();
    expect(client.fetchInvoices).toHaveBeenCalledTimes(1);
    expect(store.invoices.get({}).snapshot.data?.invoices[0].id).toBe("inv_1");
  });

  it_(
    "reports a client already reading another session, from an effect",
    async () => {
      // Two providers over one client: a client holds one session, so they
      // overwrite each other's. Worth saying once. And said, and installed,
      // from an effect — the first provider's store is listening, and a
      // reset fired from inside the second's render would update its
      // subscribers mid-render.
      const errors: string[] = [];
      const warnings: string[] = [];
      const errorSpy = vi
        .spyOn(console, "error")
        .mockImplementation((...args: unknown[]) => {
          errors.push(args.map(String).join(" "));
        });
      const warnSpy = vi
        .spyOn(console, "warn")
        .mockImplementation((...args: unknown[]) => {
          warnings.push(args.map(String).join(" "));
        });
      const client = new SchematicBillingClient({
        apiUrl: "https://api.test",
        fetch: (async () =>
          new Response(
            JSON.stringify({ data: { count: 0, invoices: [] }, params: {} }),
            { status: 200 },
          )) as typeof fetch,
      });
      function Probe() {
        const { isPending } = useInvoices();
        return <span>{isPending ? "pending" : "ok"}</span>;
      }
      const a = { company: "co_a", token: "t" };
      const b = { company: "co_b", token: "t" };
      const view = render(
        <BillingProvider billingClient={client} session={a}>
          <Probe />
        </BillingProvider>,
      );
      await flush();
      view.rerender(
        <>
          <BillingProvider billingClient={client} session={a}>
            <Probe />
          </BillingProvider>
          <BillingProvider billingClient={client} session={b}>
            <Probe />
          </BillingProvider>
        </>,
      );
      await flush();
      errorSpy.mockRestore();
      warnSpy.mockRestore();
      expect(
        errors.filter((e) => e.includes("Cannot update a component")),
      ).toHaveLength(0);
      expect(
        warnings.filter((w) => w === SESSION_REPLACED_MESSAGE),
      ).toHaveLength(1);
    },
  );

  it_(
    "seeds the first store only, not one rebuilt for another client",
    async () => {
      // Rows prefetched at mount belong to the first store; a store rebuilt
      // for a swapped client would otherwise adopt them over whatever the
      // first one had refetched since — and, unstamped, under whatever
      // session is current by then.
      const first = fakeClient({
        fetchInvoices: vi.fn(async () => rowsOf("first")),
      });
      const second = fakeClient({
        fetchInvoices: vi.fn(async () => rowsOf("second")),
      });
      const tree = (client: BillingClient) => (
        <StrictMode>
          <BillingProvider
            billingClient={client}
            session={{ company: "co_a", token: "t" }}
            initialData={{ invoices: page("seeded") }}
          >
            <Probe />
          </BillingProvider>
        </StrictMode>
      );
      function Probe() {
        const { data } = useInvoices();
        return <span>{data?.invoices[0]?.id ?? "pending"}</span>;
      }
      const view = render(tree(first));
      expect(view.container.textContent).toBe("seeded");
      await flush();
      expect(view.container.textContent).toBe("seeded");
      expect(first.fetchInvoices).not.toHaveBeenCalled();

      view.rerender(tree(second));
      await flush();
      expect(view.container.textContent).toBe("second");
      expect(second.fetchInvoices).toHaveBeenCalledTimes(1);
    },
  );

  it_("serves any number of distinct row sets without looping", async () => {
    // A handle cache that evicts hands `useSyncExternalStore` a new handle
    // on every read once keys outnumber its slots, and it re-renders until
    // React gives up.
    const client = fakeClient({
      fetchInvoices: vi.fn(async () => rowsOf("inv_1")),
    });
    function Raw({ k }: { k: number }) {
      // Stable, the way `useInvoices` builds them: a subscribe function
      // that changes identity makes `useSyncExternalStore` resubscribe.
      const source = useBillingDataSource();
      const params = useMemo(() => ({ k }) as never, [k]);
      const subscribe = useCallback(
        (listener: () => void) =>
          source.subscribe("invoices", params, listener),
        [source, params],
      );
      const getSnapshot = useCallback(
        () => source.handle("invoices", params),
        [source, params],
      );
      const handle = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
      return <i>{handle.isPending ? "p" : "d"}</i>;
    }
    const view = render(
      <BillingProvider billingClient={client}>
        {Array.from({ length: 40 }, (_, i) => (
          <Raw key={i} k={i} />
        ))}
      </BillingProvider>,
    );
    await flush();
    expect(view.container.querySelectorAll("i")).toHaveLength(40);
    expect(view.container.textContent).toBe("d".repeat(40));
    expect(client.fetchInvoices).toHaveBeenCalledTimes(40);
  });

  it("keys a row set only by the fields the request reads", () => {
    expect(
      normalizeInvoiceQuery({
        includePending: false,
        extra: Date.now(),
      } as never),
    ).toEqual({});
    expect(
      normalizeInvoiceQuery({ includePending: true, extra: 1 } as never),
    ).toEqual({ includePending: true });
  });

  it_("stays pending while the session is still pending", async () => {
    // Pending is not empty: something is coming, so the resource waits
    // rather than settling on an empty history.
    const client = fakeClient({
      fetchInvoices: vi.fn(async () => rowsOf("inv_1")),
    });
    Object.defineProperty(client, "sessionStatus", { get: () => "pending" });
    const { result } = renderHook(() => useInvoices(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <BillingProvider billingClient={client}>{children}</BillingProvider>
      ),
    });
    await flush();
    expect(result.current).toMatchObject({
      data: undefined,
      error: undefined,
      isPending: true,
    });
    expect(client.fetchInvoices).not.toHaveBeenCalled();
  });

  it_("loads what a starting session has not got yet", async () => {
    // Sign-in after a sign-out: the store was emptied, and the event says
    // there is a session to fill it for.
    let status: "pending" | "active" | "ended" = "ended";
    const client = fakeClient({
      fetchInvoices: vi.fn(async () => rowsOf("inv_1")),
    });
    Object.defineProperty(client, "sessionStatus", { get: () => status });
    const { result } = renderHook(() => useInvoices(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <BillingProvider billingClient={client}>{children}</BillingProvider>
      ),
    });
    await flush();
    expect(client.fetchInvoices).not.toHaveBeenCalled();

    status = "active";
    act(() => {
      client.listeners.forEach((listener) => listener({ type: "started" }));
    });
    await flush();
    expect(result.current.data?.invoices).toHaveLength(1);
  });

  it_("drops what is loaded when the company changes", async () => {
    const client = fakeClient({
      fetchInvoices: vi.fn(async () => rowsOf("inv_1")),
    });
    const { result } = renderHook(() => useInvoices(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <BillingProvider billingClient={client}>{children}</BillingProvider>
      ),
    });
    await flush();
    expect(client.fetchInvoices).toHaveBeenCalledTimes(1);

    act(() => {
      client.listeners.forEach((listener) => listener({ type: "changed" }));
    });
    await flush();
    expect(client.fetchInvoices).toHaveBeenCalledTimes(2);
    expect(result.current.data?.invoices).toHaveLength(1);
  });

  it_(
    "stop paging when a page comes back empty despite the count",
    async () => {
      // The rows and the count are two queries: invoices voided between them
      // leave a count that outruns the history. Without this `hasMore`
      // stays true and every further page fetches nothing.
      const rows = Array.from({ length: 12 }, (_, i) => invoice(`inv_${i}`));
      const client = fakeClient({
        fetchInvoices: vi.fn(async ({ offset }) => ({
          invoices: rows.slice(offset, offset + 12),
          count: 30,
        })),
      });
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <BillingProvider billingClient={client}>{children}</BillingProvider>
      );
      const { result } = renderHook(() => useInvoices(), { wrapper });
      await flush();
      expect(result.current.data).toMatchObject({ count: 30, hasMore: true });

      act(() => void result.current.loadMore());
      await flush();
      expect(result.current.data).toMatchObject({ hasMore: false });
      expect(result.current.data?.invoices).toHaveLength(12);

      act(() => void result.current.loadMore());
      expect(client.fetchInvoices).toHaveBeenCalledTimes(2);
    },
  );

  it_("refetch a window larger than the API serves, in pages", async () => {
    // A window paged past the API's cap still comes back whole: one
    // request would be a 400, and only the first page would drop the rest.
    const rows = Array.from({ length: 400 }, (_, i) => invoice(`inv_${i}`));
    const client = fakeClient({ fetchInvoices: vi.fn(serve(rows)) });
    const store = new BillingStore(client, {}, { pageSize: 260 });
    store.connect();
    store.invoices.get({}).subscribe(() => {});
    await flush();

    const asked = (client.fetchInvoices as ReturnType<typeof vi.fn>).mock.calls;
    expect(asked.map((call) => call[0])).toEqual([
      { limit: 250, offset: 0 },
      { limit: 10, offset: 250 },
    ]);
    expect(store.invoices.get({}).snapshot.data).toMatchObject({
      count: 400,
      hasMore: true,
    });
    expect(store.invoices.get({}).snapshot.data?.invoices).toHaveLength(260);

    store.invalidateAll();
    await flush();
    expect(store.invoices.get({}).snapshot.data?.invoices).toHaveLength(260);
  });

  it_("stops walking a window when the history shrank under it", async () => {
    // The count and the rows are two queries: a window that outruns what the
    // server will hand back must not ask for the same offset forever.
    const rows = Array.from({ length: 12 }, (_, i) => invoice(`inv_${i}`));
    const client = fakeClient({
      fetchInvoices: vi.fn(async ({ limit, offset }) => ({
        invoices: rows.slice(offset, offset + limit),
        count: 400,
      })),
    });
    const store = new BillingStore(client, {}, { pageSize: 260 });
    store.connect();
    store.invoices.get({}).subscribe(() => {});
    await flush();
    expect(store.invoices.get({}).snapshot.data?.invoices).toHaveLength(12);
    expect(client.fetchInvoices).toHaveBeenCalledTimes(2);
  });

  it_(
    "SchematicProvider provides the billing hooks alongside flags",
    async () => {
      const client = fakeClient({
        fetchInvoices: vi.fn(async () => rowsOf("inv_1")),
      });
      function Probe() {
        const { data } = useInvoices();
        return (
          <span>{data === undefined ? "pending" : data.invoices[0].id}</span>
        );
      }
      render(
        <SchematicProvider publishableKey="pk" billingClient={client}>
          <Probe />
        </SchematicProvider>,
      );
      expect(screen.getByText("pending")).toBeTruthy();
      await flush();
      expect(screen.getByText("inv_1")).toBeTruthy();
    },
  );

  it_("reads billing from the API a host's own client points at", async () => {
    // The case worth catching: flags from staging, billing from production.
    // The provider builds the billing client, so it has to take the API from
    // the client it was handed — defaulting would send this session's access
    // token to api.schematichq.com.
    const requests: Array<{ url: string; headers: Record<string, string> }> =
      [];
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async (url: string, init: RequestInit) => {
      requests.push({
        url: String(url),
        headers: (init.headers ?? {}) as Record<string, string>,
      });
      return new Response(
        JSON.stringify({ data: { count: 0, invoices: [] }, params: {} }),
        { status: 200 },
      );
    }) as unknown as typeof fetch;

    try {
      function Probe() {
        useInvoices();
        return null;
      }
      render(
        <SchematicProvider
          client={new Schematic("pk", { apiUrl: "https://api.staging.test" })}
          session={{ company: "co_1", token: "tok" }}
        >
          <Probe />
        </SchematicProvider>,
      );
      await flush();

      expect(requests).toHaveLength(1);
      expect(requests[0].url).toMatch(/^https:\/\/api\.staging\.test\//);
      // Stamped as the React SDK, not as the client it was built beside.
      expect(requests[0].headers["X-Schematic-Client-Version"]).toMatch(
        /^schematic-react@/,
      );
    } finally {
      globalThis.fetch = realFetch;
    }
  });

  it_("keeps what it loaded when only the client object changes", async () => {
    // `client={new Schematic(...)}` inline is a new object every render, and
    // says nothing new. The billing client owns the store, so rebuilding it
    // on that would drop every loaded row and start the token cache over: a
    // list snapping back to its skeleton and re-paging from one, and a mint
    // against the host's auth endpoint, on every render of an ancestor.
    let fetches = 0;
    const token = vi.fn(async () => "tok");
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      fetches += 1;
      return new Response(
        JSON.stringify({
          data: { count: 1, invoices: [{ id: "inv_1" }] },
          params: {},
        }),
        { status: 200 },
      );
    }) as unknown as typeof fetch;

    try {
      function Probe() {
        const { data } = useInvoices();
        return <span>{data?.invoices[0]?.id ?? "pending"}</span>;
      }
      const at = () => (
        <SchematicProvider
          client={new Schematic("pk", { apiUrl: "https://api.staging.test" })}
          session={{ company: "co_1", token }}
        >
          <Probe />
        </SchematicProvider>
      );

      const view = render(at());
      await flush();
      expect(view.container.textContent).toBe("inv_1");
      expect(fetches).toBe(1);

      view.rerender(at());
      await flush();
      view.rerender(at());
      await flush();

      expect(view.container.textContent).toBe("inv_1");
      expect(fetches).toBe(1);
      expect(token).toHaveBeenCalledTimes(1);
    } finally {
      globalThis.fetch = realFetch;
    }
  });

  it_(
    "BillingDataProvider feeds the hooks from plain data with status overrides",
    () => {
      const onRefetch = vi.fn();
      const { result } = renderHook(() => useInvoices(), {
        wrapper: ({ children }) => (
          <BillingDataProvider
            data={{ invoices: page("inv_1") }}
            status={{ invoices: { error: new Error("x") } }}
            onRefetch={onRefetch}
          >
            {children}
          </BillingDataProvider>
        ),
      });
      expect(result.current).toMatchObject({ error: new Error("x") });
      expect(result.current.data?.invoices).toHaveLength(1);
      result.current.refetch();
      expect(onRefetch).toHaveBeenCalledWith("invoices");
    },
  );
});

describe("useUpcomingInvoice", () => {
  const wrap = (client: BillingClient, initialData?: BillingData) => {
    function Wrapper({ children }: { children: React.ReactNode }) {
      return (
        <BillingProvider billingClient={client} initialData={initialData}>
          {children}
        </BillingProvider>
      );
    }
    return Wrapper;
  };

  it_("reports the missing-source error outside any provider", () => {
    const { result } = renderHook(() => useUpcomingInvoice());
    expect(result.current.error?.message).toBe(MISSING_BILLING_SOURCE_MESSAGE);
  });

  it_("loads the next bill once for every reader", async () => {
    const client = fakeClient({
      fetchUpcomingInvoice: vi.fn(async () => bill(6800)),
    });
    const { result } = renderHook(
      () => [useUpcomingInvoice(), useUpcomingInvoice()] as const,
      { wrapper: wrap(client) },
    );
    expect(result.current[0].isPending).toBe(true);
    await flush();
    expect(result.current[0].data?.amountDue).toBe(6800);
    expect(result.current[1].data).toBe(result.current[0].data);
    expect(client.fetchUpcomingInvoice).toHaveBeenCalledTimes(1);
    act(() => result.current[0].refetch());
    await flush();
    expect(client.fetchUpcomingInvoice).toHaveBeenCalledTimes(2);
  });

  it_("reads no next bill as loaded, not as pending", async () => {
    // `null` is the server's answer — no subscription — and an element
    // renders an empty state on it. Only `undefined` means not loaded.
    const client = fakeClient();
    const { result } = renderHook(() => useUpcomingInvoice(), {
      wrapper: wrap(client),
    });
    await flush();
    expect(result.current).toMatchObject({
      data: null,
      error: undefined,
      isPending: false,
    });
  });

  it_("serves a prefetched bill without a request", async () => {
    const client = fakeClient({
      fetchUpcomingInvoice: vi.fn(async () => bill(1)),
    });
    const { result } = renderHook(() => useUpcomingInvoice(), {
      wrapper: wrap(client, { upcomingInvoice: bill(6800) }),
    });
    expect(result.current.data?.amountDue).toBe(6800);
    await flush();
    expect(client.fetchUpcomingInvoice).not.toHaveBeenCalled();
  });

  it_("serves a prefetched null without asking again", async () => {
    // The prefetch already made the request whose answer is "nothing";
    // a truthiness check on the seed would make the page ask once more.
    const client = fakeClient({
      fetchUpcomingInvoice: vi.fn(async () => bill(1)),
    });
    const { result } = renderHook(() => useUpcomingInvoice(), {
      wrapper: wrap(client, { upcomingInvoice: null }),
    });
    expect(result.current).toMatchObject({ data: null, isPending: false });
    await flush();
    expect(client.fetchUpcomingInvoice).not.toHaveBeenCalled();
  });

  it_("seeds each resource the prefetch carried, and only those", async () => {
    const client = fakeClient({
      fetchInvoices: vi.fn(async () => rowsOf("fetched")),
      fetchUpcomingInvoice: vi.fn(async () => bill(1)),
    });
    const { result } = renderHook(
      () => [useInvoices(), useUpcomingInvoice()] as const,
      { wrapper: wrap(client, { upcomingInvoice: bill(6800) }) },
    );
    expect(result.current[1].data?.amountDue).toBe(6800);
    expect(result.current[0].isPending).toBe(true);
    await flush();
    expect(result.current[0].data?.invoices[0].id).toBe("fetched");
    expect(client.fetchUpcomingInvoice).not.toHaveBeenCalled();
  });

  it_(
    "holds a stamped bill with the rows until the session is checked",
    async () => {
      let status: "pending" | "active" | "ended" = "pending";
      let key: string | undefined = undefined;
      const client = fakeClient({
        fetchUpcomingInvoice: vi.fn(async () => bill(1)),
      });
      Object.defineProperty(client, "sessionStatus", { get: () => status });
      Object.defineProperty(client, "sessionKey", { get: () => key });
      const store = new BillingStore(client, {
        invoices: page("seeded"),
        upcomingInvoice: bill(6800),
        sessionKey: "company_a",
      });
      store.connect();
      const resource = store.upcomingInvoice.get({});
      resource.subscribe(() => {});
      await flush();
      expect(resource.snapshot).toMatchObject({
        data: undefined,
        isPending: true,
      });

      status = "active";
      key = "company_a";
      act(() => {
        client.listeners.forEach((listener) => listener({ type: "started" }));
      });
      await flush();
      expect(resource.snapshot.data?.amountDue).toBe(6800);
      expect(store.invoices.get({}).snapshot.data?.invoices[0].id).toBe(
        "seeded",
      );
      expect(client.fetchUpcomingInvoice).not.toHaveBeenCalled();
    },
  );

  it_("drops a bill prefetched for another session", async () => {
    const client = fakeClient({
      fetchUpcomingInvoice: vi.fn(async () => bill(1)),
    });
    Object.defineProperty(client, "sessionStatus", { get: () => "active" });
    Object.defineProperty(client, "sessionKey", { get: () => "company_a" });
    const store = new BillingStore(client, {
      upcomingInvoice: bill(6800),
      sessionKey: "company_b",
    });
    store.connect();
    const resource = store.upcomingInvoice.get({});
    resource.subscribe(() => {});
    await flush();
    expect(resource.snapshot.data?.amountDue).toBe(1);
  });

  it_("drops the bill when the session changes, and reloads it", async () => {
    const client = fakeClient({
      fetchUpcomingInvoice: vi.fn(async () => bill(6800)),
    });
    const { result } = renderHook(() => useUpcomingInvoice(), {
      wrapper: wrap(client),
    });
    await flush();
    expect(client.fetchUpcomingInvoice).toHaveBeenCalledTimes(1);
    act(() => {
      client.listeners.forEach((listener) => listener({ type: "changed" }));
    });
    await flush();
    expect(client.fetchUpcomingInvoice).toHaveBeenCalledTimes(2);
    expect(result.current.data?.amountDue).toBe(6800);
  });

  it_("waits rather than failing while the session is pending", async () => {
    const client = fakeClient({
      fetchUpcomingInvoice: vi.fn(async () => bill(6800)),
    });
    Object.defineProperty(client, "sessionStatus", { get: () => "pending" });
    const { result } = renderHook(() => useUpcomingInvoice(), {
      wrapper: wrap(client),
    });
    await flush();
    expect(result.current).toMatchObject({
      data: undefined,
      error: undefined,
      isPending: true,
    });
    expect(client.fetchUpcomingInvoice).not.toHaveBeenCalled();
  });

  it_("serves it from plain data with no client at all", () => {
    const { result } = renderHook(() => useUpcomingInvoice(), {
      wrapper: ({ children }) => (
        <BillingProvider initialData={{ upcomingInvoice: null }}>
          {children}
        </BillingProvider>
      ),
    });
    expect(result.current).toMatchObject({ data: null, isPending: false });
  });
});

describe("BillingStore", () => {
  it("invalidateAll refetches a loaded null, not an unloaded resource", async () => {
    // A company with no next bill today may have one after a checkout; the
    // null it holds is loaded data, and reloads with everything else.
    const client = fakeClient();
    const store = new BillingStore(client);
    store.connect();
    store.invalidateAll();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(client.fetchUpcomingInvoice).not.toHaveBeenCalled();
    await store.upcomingInvoice.get({}).load();
    expect(store.upcomingInvoice.get({}).snapshot.data).toBeNull();
    store.invalidateAll();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(client.fetchUpcomingInvoice).toHaveBeenCalledTimes(2);
  });

  it("invalidateAll refetches only loaded resources", async () => {
    const client = fakeClient();
    const store = new BillingStore(client);
    store.connect();
    store.invalidateAll();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(client.fetchInvoices).not.toHaveBeenCalled();
    await store.invoices.get({}).load();
    store.invalidateAll();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(client.fetchInvoices).toHaveBeenCalledTimes(2);
  });
});
