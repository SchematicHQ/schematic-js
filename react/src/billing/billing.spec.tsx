import { SchematicBillingClient } from "@schematichq/schematic-js";
import { act, render, renderHook, screen } from "@testing-library/react";
import React, { StrictMode } from "react";
import { vi } from "vitest";

import { SchematicProvider } from "../context";
import { useSchematicI18n } from "../i18n";

import { BillingStore, type BillingClient, type SessionEvent } from "./client";
import { BillingDataProvider, MISSING_BILLING_SOURCE_MESSAGE } from "./context";
import type { BillingData, Invoice } from "./contract";
import { useInvalidateBillingData, useInvoices } from "./hooks";
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

/** What the client answers with: the rows asked for, and the total. */
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
    // and refetching rows already on screen.
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
      // The count is of the history, not of the rows loaded, so the card can
      // say how many invoices stand behind the twelve on screen.
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

  it_(
    "does not repeat a row when the history grew under the reader",
    async () => {
      // Newest first, so an invoice finalized between the two clicks shifts
      // every row down and the next offset serves rows already on screen.
      const history = {
        rows: Array.from({ length: 6 }, (_, i) => invoice(`inv_${6 - i}`)),
      };
      const client = fakeClient({
        fetchInvoices: vi.fn(async ({ limit, offset }) => ({
          invoices: history.rows.slice(offset, offset + limit),
          count: history.rows.length,
        })),
      });
      const store = new BillingStore(client, {}, 2);
      const resource = store.invoices.get({});
      resource.subscribe(() => {});
      await flush();
      expect(resource.snapshot.data?.invoices.map((row) => row.id)).toEqual([
        "inv_6",
        "inv_5",
      ]);

      history.rows = [invoice("inv_7"), ...history.rows];
      await store.loadMoreInvoices({});
      await flush();
      // Without the drop this reads inv_6, inv_5, inv_5, inv_4.
      expect(resource.snapshot.data?.invoices.map((row) => row.id)).toEqual([
        "inv_6",
        "inv_5",
        "inv_4",
      ]);
      expect(resource.snapshot.data).toMatchObject({ count: 7, hasMore: true });
    },
  );

  it_("keeps paging when a whole page has already been seen", async () => {
    // More new invoices than fit a page: every row the next offset serves is
    // one already on screen. Dropping them and stopping would leave the list
    // where it was, so "Load more" would click forever without advancing.
    const history = {
      rows: Array.from({ length: 6 }, (_, i) => invoice(`old_${6 - i}`)),
    };
    const client = fakeClient({
      fetchInvoices: vi.fn(async ({ limit, offset }) => ({
        invoices: history.rows.slice(offset, offset + limit),
        count: history.rows.length,
      })),
    });
    const store = new BillingStore(client, {}, 2);
    const resource = store.invoices.get({});
    resource.subscribe(() => {});
    await flush();
    expect(resource.snapshot.data?.invoices.map((row) => row.id)).toEqual([
      "old_6",
      "old_5",
    ]);

    // Two arrive, exactly a page: offset 2 now serves old_6 and old_5 again.
    history.rows = [invoice("new_2"), invoice("new_1"), ...history.rows];
    await store.loadMoreInvoices({});
    await flush();
    const ids = resource.snapshot.data?.invoices.map((row) => row.id) ?? [];
    expect(ids).toEqual(["old_6", "old_5", "old_4", "old_3"]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it_("bounds the requests one loadMore can make", async () => {
    // The ORDER BY behind this endpoint has no unique tiebreaker, so pages
    // can overlap; a broken one could overlap forever. Skipping duplicates
    // must not turn a click into a walk of the whole history.
    const client = fakeClient({
      fetchInvoices: vi.fn(async () => ({
        invoices: [invoice("a"), invoice("b")],
        count: 5000,
      })),
    });
    const store = new BillingStore(client, {}, 2);
    const resource = store.invoices.get({});
    resource.subscribe(() => {});
    await flush();
    const afterLoad = (client.fetchInvoices as ReturnType<typeof vi.fn>).mock
      .calls.length;

    await store.loadMoreInvoices({});
    await flush();
    const requests =
      (client.fetchInvoices as ReturnType<typeof vi.fn>).mock.calls.length -
      afterLoad;
    expect(requests).toBeLessThanOrEqual(3);
    // Still offered, so the reader decides whether to ask again.
    expect(resource.snapshot.data).toMatchObject({ hasMore: true });
    expect(resource.snapshot.error).toBeUndefined();
  });

  it_("does not collapse rows that arrive without an id", async () => {
    // `id` is required on the wire but nothing validates it, and dropping
    // every row after the first would be worse than showing a repeat.
    const rows = [
      invoice("inv_2"),
      invoice("inv_1"),
      {} as unknown as Invoice,
      {} as unknown as Invoice,
    ];
    const client = fakeClient({ fetchInvoices: vi.fn(serve(rows)) });
    const store = new BillingStore(client, {}, 2);
    const resource = store.invoices.get({});
    resource.subscribe(() => {});
    await flush();
    await store.loadMoreInvoices({});
    await flush();
    expect(resource.snapshot.data?.invoices).toHaveLength(4);
  });

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

    // A second click while the first page is in flight is not a second request.
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
      // The card on screen at sign-out is not the only one: a page opened
      // afterwards mounts a resource that has never loaded, and it must not
      // fetch its way into showing the client's refusal as an error.
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
      // announced. The client declines a token stamped for another company,
      // which is what closes the window between a host rendering a new
      // session and the effect that states it — a window this harness
      // cannot open, because `act` runs the effect before anything can
      // observe the render.
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

  it_("empties the card when the session ends, without an error", async () => {
    // A reader who signed out is shown nothing, not a complaint.
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
  });

  it_(
    "does not page a seeded list while the session is still resolving",
    async () => {
      // The reader clicks Load more before the host's auth has resolved. The
      // real client has no credential to send, and rendering its refusal
      // would be a complaint about the reader's own page — one that stays,
      // since a resource holding rows is not something `resumeAll` reloads.
      let status: "pending" | "active" | "ended" = "pending";
      const client = fakeClient({
        fetchInvoices: vi.fn(async () => rowsOf("inv_2")),
      });
      Object.defineProperty(client, "sessionStatus", { get: () => status });
      const { result } = renderHook(() => useInvoices(), {
        wrapper: ({ children }: { children: React.ReactNode }) => (
          <BillingProvider
            billingClient={client}
            initialData={{
              invoices: {
                invoices: [invoice("inv_1")],
                count: 9,
                hasMore: true,
              },
            }}
          >
            {children}
          </BillingProvider>
        ),
      });
      await flush();

      await act(() => result.current.loadMore());
      await flush();
      expect(client.fetchInvoices).not.toHaveBeenCalled();
      expect(result.current).toMatchObject({ error: undefined });
      expect(result.current.data?.invoices).toHaveLength(1);

      // The session lands; the next click pages as it always would.
      status = "active";
      act(() => {
        client.listeners.forEach((listener) => listener({ type: "started" }));
      });
      await act(() => result.current.loadMore());
      await flush();
      expect(client.fetchInvoices).toHaveBeenCalledTimes(1);
      expect(result.current.error).toBeUndefined();
      expect(result.current.data?.invoices.map((row) => row.id)).toEqual([
        "inv_1",
        "inv_2",
      ]);
    },
  );

  it_("invalidateBillingData reloads every loaded resource", async () => {
    const client = fakeClient({
      fetchInvoices: vi.fn(async () => rowsOf("inv_1")),
    });
    const { result } = renderHook(
      () => ({ list: useInvoices(), invalidate: useInvalidateBillingData() }),
      {
        wrapper: ({ children }: { children: React.ReactNode }) => (
          <BillingProvider billingClient={client}>{children}</BillingProvider>
        ),
      },
    );
    await flush();
    expect(client.fetchInvoices).toHaveBeenCalledTimes(1);

    act(() => result.current.invalidate());
    await flush();
    expect(client.fetchInvoices).toHaveBeenCalledTimes(2);
    // Reloaded in place: the rows never left the screen.
    expect(result.current.list.data?.invoices).toHaveLength(1);
    expect(result.current.list.error).toBeUndefined();
  });

  it_("reports the missing-source error from invalidate too", () => {
    // Outside a provider it is a no-op rather than a throw, so an element
    // wiring a "refresh" button does not crash the host tree.
    const { result } = renderHook(() => useInvalidateBillingData());
    expect(() => result.current()).not.toThrow();
  });

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

  it_("shows a signed-out reader nothing, prefetch or not", async () => {
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
  });

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
    // Same company: the rows stand, and nothing was fetched for them.
    expect(store.invoices.get({}).snapshot.data?.invoices[0].id).toBe("seeded");
    expect(client.fetchInvoices).not.toHaveBeenCalled();
  });

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

  it_("holds the skeleton while the session is still pending", async () => {
    // Pending is not empty: something is coming, so the card waits rather
    // than telling a reader there is nothing.
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
      // leave a count that outruns the history. Without this the button stays
      // on screen and every click fetches nothing.
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

      // And the list stays put rather than issuing another request.
      act(() => void result.current.loadMore());
      expect(client.fetchInvoices).toHaveBeenCalledTimes(2);
    },
  );

  it_("refetch a window larger than the API serves, in pages", async () => {
    // A reader who has paged past the API's cap still gets their whole
    // window back: one request would be a 400, and only the first page would
    // make the rest vanish from the table.
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

  it_("SchematicProvider forwards the i18n props to the elements", () => {
    // The whole host path: SchematicProvider hands them to BillingProvider,
    // which renders the i18n provider the elements read.
    const onMissingString = vi.fn();
    const translate = vi.fn();
    function Probe() {
      const i18n = useSchematicI18n();
      return (
        <span>
          {`${i18n.locale} ${i18n.strings?.retry} ${
            i18n.translate === translate
          } ${i18n.onMissingString === onMissingString}`}
        </span>
      );
    }
    render(
      <SchematicProvider
        publishableKey="pk"
        billingClient={fakeClient()}
        locale="es-ES"
        strings={{ retry: "Reintentar" }}
        translate={translate}
        onMissingString={onMissingString}
      >
        <Probe />
      </SchematicProvider>,
    );
    expect(screen.getByText("es-ES Reintentar true true")).toBeTruthy();
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

  it_(
    "BillingDataProvider reports loadMore to onLoadMoreInvoices",
    async () => {
      // A fixture serves one value per resource and never pages, so the host
      // drives the story itself: the callback is how it hears the click.
      const onLoadMoreInvoices = vi.fn();
      const { result } = renderHook(
        () => useInvoices({ includePending: true }),
        {
          wrapper: ({ children }) => (
            <BillingDataProvider
              data={{ invoices: page("inv_1") }}
              onLoadMoreInvoices={onLoadMoreInvoices}
            >
              {children}
            </BillingDataProvider>
          ),
        },
      );
      await act(() => result.current.loadMore());
      // Normalized, the way the store keys it — a fixture matching on the query
      // sees the same shape a real resource would be stored under.
      expect(onLoadMoreInvoices).toHaveBeenCalledWith({ includePending: true });
    },
  );

  it_(
    "BillingDataProvider settles loadMore with no callback at all",
    async () => {
      const { result } = renderHook(() => useInvoices(), {
        wrapper: ({ children }) => (
          <BillingDataProvider data={{ invoices: page("inv_1") }}>
            {children}
          </BillingDataProvider>
        ),
      });
      await expect(
        act(() => result.current.loadMore()),
      ).resolves.toBeUndefined();
      expect(result.current.error).toBeUndefined();
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
