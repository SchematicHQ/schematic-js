import { Schematic, SchematicBillingClient } from "@schematichq/schematic-js";
import { act, render, renderHook, screen } from "@testing-library/react";
import React, { StrictMode } from "react";
import { vi } from "vitest";

import { SchematicProvider } from "../context";

import { BillingStore, type BillingClient, type SessionEvent } from "./client";
import { BillingDataProvider, MISSING_BILLING_SOURCE_MESSAGE } from "./context";
import type { BillingData, Invoice } from "./contract";
import { useInvoices } from "./hooks";
import { BillingProvider } from "./provider";

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

  it_(
    "hands the client one provider that reads the latest token prop",
    async () => {
      // A host writing `token: async () => …` inline hands over a new function
      // every render. The client sees one, so the churn is not a session
      // change, and it still calls whatever the newest prop points at.
      const client = fakeClient();
      const forwarded = () =>
        (client.setSession as ReturnType<typeof vi.fn>).mock.calls
          .map((call) => call[0])
          .filter((value): value is { company: string; token: () => unknown } =>
            Boolean(value),
          );

      const view = render(
        <BillingProvider
          billingClient={client}
          session={{ company: "company_a", token: async () => "t1" }}
        >
          <span />
        </BillingProvider>,
      );
      await flush();
      view.rerender(
        <BillingProvider
          billingClient={client}
          session={{ company: "company_a", token: async () => "t2" }}
        >
          <span />
        </BillingProvider>,
      );
      await flush();

      const tokens = forwarded().map((session) => session.token);
      expect(tokens.length).toBeGreaterThan(1);
      // One function, however many renders — and it resolves the latest prop,
      // stamped with the company it was minted for so the client can decline
      // one that names another.
      expect(new Set(tokens).size).toBe(1);
      await expect(tokens[0]()).resolves.toEqual({
        token: "t2",
        company: "company_a",
        user: undefined,
      });
    },
  );

  it_(
    "stamps every session it announces with that session's pair",
    async () => {
      // `install` writes the token and states the session together, so what
      // the provider answers is always stamped with the company being
      // announced. That is what lets the client decline a token minted for
      // another company, closing the window between a host rendering a new
      // session and the effect that states it.
      const announced: { company: string; stamped: unknown }[] = [];
      const client = fakeClient({
        setSession: vi.fn((input) => {
          if (input === null || input === undefined) return;
          const token = input.token;
          if (typeof token !== "function") return;
          announced.push({ company: input.company, stamped: token() });
        }),
      });

      const view = render(
        <BillingProvider
          billingClient={client}
          session={{ company: "company_a", token: async () => "t_a" }}
        >
          <span />
        </BillingProvider>,
      );
      await flush();
      view.rerender(
        <BillingProvider
          billingClient={client}
          session={{ company: "company_b", token: async () => "t_b" }}
        >
          <span />
        </BillingProvider>,
      );
      await flush();

      expect(announced.length).toBeGreaterThan(1);
      for (const { company, stamped } of announced) {
        await expect(stamped).resolves.toEqual({
          token: company === "company_a" ? "t_a" : "t_b",
          company,
          user: undefined,
        });
      }
    },
  );

  it_("keeps a stamp the host's own provider supplied", async () => {
    // A host whose company id and token come from different places — a route
    // param and an auth SDK — can have the token move first. Relabelled with
    // the session prop's key, the client would compare that key against
    // itself and send the next company's token for this company's request.
    const announced: unknown[] = [];
    const client = fakeClient({
      setSession: vi.fn((input) => {
        if (input === null || input === undefined) return;
        const token = input.token;
        if (typeof token === "function") announced.push(token());
      }),
    });

    render(
      <BillingProvider
        billingClient={client}
        session={{
          company: "company_a",
          token: async () => ({ token: "t_b", company: "company_b" }),
        }}
      >
        <span />
      </BillingProvider>,
    );
    await flush();

    expect(announced.length).toBeGreaterThan(0);
    await expect(announced[0]).resolves.toEqual({
      token: "t_b",
      company: "company_b",
      user: undefined,
    });
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

  it_("keeps a prefetch that names the session it arrives in", async () => {
    // The point of prefetching: rows on the first render, even though the
    // host's auth resolves a render later.
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
    expect(store.invoices.get({}).snapshot.data?.invoices[0].id).toBe("seeded");

    status = "active";
    key = "company_a";
    act(() => {
      client.listeners.forEach((listener) => listener({ type: "started" }));
    });
    await flush();
    expect(store.invoices.get({}).snapshot.data?.invoices[0].id).toBe("seeded");
    expect(client.fetchInvoices).not.toHaveBeenCalled();
  });

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
      // A resource that failed with rows still on screen keeps both, and
      // `resumeAll` used to pass over anything holding data — so the failure
      // sat there until someone refetched by hand. A failure is not a reason
      // to try again on its own, but a session arriving is: it is the thing a
      // request that failed for want of one was waiting for.
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
    const store = new BillingStore(client, {}, 260);
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
    const store = new BillingStore(client, {}, 260);
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

describe("BillingStore", () => {
  it("invalidateAll refetches only loaded resources", async () => {
    const client = fakeClient();
    const store = new BillingStore(client);
    store.invalidateAll();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(client.fetchInvoices).not.toHaveBeenCalled();
    await store.invoices.get({}).load();
    store.invalidateAll();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(client.fetchInvoices).toHaveBeenCalledTimes(2);
  });
});
