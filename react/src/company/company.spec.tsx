import { SchematicCompanyClient } from "@schematichq/schematic-js";
import { act, render, renderHook, screen } from "@testing-library/react";
import React, { StrictMode } from "react";
import { vi } from "vitest";

import { SchematicProvider } from "../context";

import { CompanyStore, type CompanyClient } from "./client";
import { CompanyDataProvider, MISSING_COMPANY_SOURCE_MESSAGE } from "./context";
import type { CompanyData, Invoice } from "./contract";
import { useInvoices } from "./hooks";
import { CompanyProvider } from "./provider";

const isDOMEnvironment = typeof document !== "undefined";
const it_ = isDOMEnvironment ? it : it.skip;

const flush = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));

const invoice = (id: string) => ({ id }) as unknown as Invoice;
const page = (...ids: string[]): CompanyData["invoices"] => ({
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

function fakeClient(overrides: Partial<CompanyClient> = {}): CompanyClient & {
  listeners: (() => void)[];
} {
  const listeners: (() => void)[] = [];
  return {
    listeners,
    fetchInvoices: vi.fn(async () => rowsOf()),
    onCredentialsChange: (listener) => {
      listeners.push(listener);
      return () => {};
    },
    ...overrides,
  };
}

describe("company hooks", () => {
  it_("report the missing-source error outside any provider", () => {
    const { result } = renderHook(() => useInvoices());
    expect(result.current.error?.message).toBe(MISSING_COMPANY_SOURCE_MESSAGE);
    expect(result.current.isPending).toBe(false);
  });

  it_("load through the client and expose refetch", async () => {
    const client = fakeClient({
      fetchInvoices: vi.fn(async () => rowsOf("inv_1")),
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CompanyProvider companyClient={client}>{children}</CompanyProvider>
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
      const initialData: CompanyData = { invoices: page("inv_1") };
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <CompanyProvider companyClient={client} initialData={initialData}>
          {children}
        </CompanyProvider>
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
        <CompanyProvider initialData={{ invoices: page("inv_1") }}>
          {children}
        </CompanyProvider>
      ),
    });
    expect(result.current.data?.invoices).toHaveLength(1);
  });

  it_("reset every resource when the client's credentials change", async () => {
    const client = fakeClient({
      fetchInvoices: vi.fn(async () => rowsOf("inv_1")),
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CompanyProvider companyClient={client}>{children}</CompanyProvider>
    );
    const { result } = renderHook(() => useInvoices(), { wrapper });
    await flush();
    expect(result.current.data).toBeDefined();
    act(() => client.listeners.forEach((l) => l()));
    expect(result.current).toMatchObject({ data: undefined, isPending: true });
    await flush();
    expect(client.fetchInvoices).toHaveBeenCalledTimes(2);
  });

  it_("forward the accessToken prop to the client", () => {
    const client = fakeClient({ setAccessToken: vi.fn() });
    const { rerender } = render(
      <CompanyProvider companyClient={client} accessToken="t1">
        <span />
      </CompanyProvider>,
    );
    expect(client.setAccessToken).toHaveBeenCalledWith("t1", undefined);
    rerender(
      <CompanyProvider companyClient={client} accessToken="t2">
        <span />
      </CompanyProvider>,
    );
    expect(client.setAccessToken).toHaveBeenLastCalledWith("t2", undefined);
  });

  it_("do not read a re-rendered inline accessToken as a new session", () => {
    // The documented usage is an inline arrow, so every render hands over a
    // new function. Forwarding those would reset every resource each time.
    const client = fakeClient({ setAccessToken: vi.fn() });
    const view = render(
      <CompanyProvider companyClient={client} accessToken={async () => "t1"}>
        <span />
      </CompanyProvider>,
    );
    for (let i = 0; i < 3; i++) {
      view.rerender(
        <CompanyProvider companyClient={client} accessToken={async () => "t1"}>
          <span />
        </CompanyProvider>,
      );
    }
    expect(client.setAccessToken).toHaveBeenCalledTimes(1);
  });

  it_("forward a provider that reads the latest accessToken prop", async () => {
    const client = fakeClient({ setAccessToken: vi.fn() });
    const view = render(
      <CompanyProvider companyClient={client} accessToken={async () => "t1"}>
        <span />
      </CompanyProvider>,
    );
    const forwarded = vi.mocked(client.setAccessToken!).mock
      .calls[0][0] as () => Promise<string>;
    await expect(forwarded()).resolves.toBe("t1");

    // Stable identity, current behaviour: the client keeps the one function
    // and still reaches whatever the host most recently passed.
    view.rerender(
      <CompanyProvider companyClient={client} accessToken={async () => "t2"}>
        <span />
      </CompanyProvider>,
    );
    expect(client.setAccessToken).toHaveBeenCalledTimes(1);
    await expect(forwarded()).resolves.toBe("t2");
  });

  it_("install the token before a child's first request", async () => {
    // A child's subscription effect runs before the provider's, so a token
    // installed in an effect would arrive one failed request too late.
    const order: string[] = [];
    const client = fakeClient({
      setAccessToken: vi.fn(() => {
        order.push("token");
      }),
      fetchInvoices: vi.fn(async () => {
        order.push("fetch");
        return rowsOf();
      }),
    });
    renderHook(() => useInvoices(), {
      wrapper: ({ children }) => (
        <CompanyProvider companyClient={client} accessToken="t1">
          {children}
        </CompanyProvider>
      ),
    });
    await flush();
    expect(order).toEqual(["token", "fetch"]);
  });

  it_("keep listening for credential changes under StrictMode", () => {
    // StrictMode runs effect / cleanup / effect. A subscription made once in
    // the store's constructor is torn down by that cleanup and never comes
    // back, leaving the store deaf for the rest of the page.
    let listener: (() => void) | undefined;
    const client = fakeClient({
      onCredentialsChange: (fn) => {
        listener = fn;
        return () => {
          listener = undefined;
        };
      },
    });
    render(
      <StrictMode>
        <CompanyProvider companyClient={client} accessToken="t1">
          <span />
        </CompanyProvider>
      </StrictMode>,
    );
    expect(listener).toBeDefined();
  });

  it_("drop every resource when sessionKey changes", async () => {
    // What the client cannot see for itself: a provider function swapped to
    // point at a different company.
    const client = fakeClient({
      fetchInvoices: vi.fn(async () => rowsOf("inv_a")),
      setAccessToken: vi.fn(),
    });
    const token = async () => "t";
    const view = render(
      <CompanyProvider
        companyClient={client}
        accessToken={token}
        sessionKey="company_a"
      >
        <span />
      </CompanyProvider>,
    );
    expect(client.setAccessToken).toHaveBeenLastCalledWith(
      expect.any(Function),
      "company_a",
    );

    view.rerender(
      <CompanyProvider
        companyClient={client}
        accessToken={token}
        sessionKey="company_b"
      >
        <span />
      </CompanyProvider>,
    );
    expect(client.setAccessToken).toHaveBeenLastCalledWith(
      expect.any(Function),
      "company_b",
    );
    expect(client.setAccessToken).toHaveBeenCalledTimes(2);
  });

  it_("do not reset the store while rendering", async () => {
    // Installing a token runs the store's reset, and that sets state on every
    // subscriber. During render React reports it as "Cannot update a
    // component while rendering a different component".
    let notify: (() => void) | undefined;
    let session: string | undefined;
    const client = fakeClient({
      onCredentialsChange: (listener) => {
        notify = listener;
        return () => {
          notify = undefined;
        };
      },
      setAccessToken: (_token, next?: string) => {
        if (next !== session) {
          session = next;
          notify?.();
        }
      },
    });
    const errors: string[] = [];
    const spy = vi.spyOn(console, "error").mockImplementation((...args) => {
      errors.push(String(args[0]));
    });

    function Reader() {
      useInvoices();
      return <span />;
    }
    const token = async () => "t";
    const view = render(
      <CompanyProvider
        companyClient={client}
        accessToken={token}
        sessionKey="a"
      >
        <Reader />
      </CompanyProvider>,
    );
    await flush();
    view.rerender(
      <CompanyProvider
        companyClient={client}
        accessToken={token}
        sessionKey="b"
      >
        <Reader />
      </CompanyProvider>,
    );
    await flush();
    spy.mockRestore();

    expect(
      errors.filter((e) => /while rendering a different component/.test(e)),
    ).toEqual([]);
    expect(session).toBe("b");
  });

  it_("load once a real client is given a token it did not have", async () => {
    // Against the real client, not a fake: the hole this covers was invisible
    // to every spec here because they all stub CompanyClient.
    let fetches = 0;
    const client = new SchematicCompanyClient({
      apiUrl: "https://api.test",
      fetch: (async () => {
        fetches += 1;
        return new Response(
          JSON.stringify({ data: { count: 0, invoices: [] }, params: {} }),
          { status: 200 },
        );
      }) as unknown as typeof fetch,
    });

    function Reader() {
      const { error, isPending } = useInvoices();
      return <span>{error ? "error" : isPending ? "pending" : "ok"}</span>;
    }

    // A host that fetches its token asynchronously renders once without one.
    const view = render(
      <CompanyProvider companyClient={client}>
        <Reader />
      </CompanyProvider>,
    );
    await flush();
    expect(view.container.textContent).toBe("error");
    expect(fetches).toBe(0);

    view.rerender(
      <CompanyProvider companyClient={client} accessToken="tok_1">
        <Reader />
      </CompanyProvider>,
    );
    await flush();
    expect(view.container.textContent).toBe("ok");
    expect(fetches).toBe(1);
  });

  it_("load again after signing out and back in", async () => {
    let fetches = 0;
    const client = new SchematicCompanyClient({
      apiUrl: "https://api.test",
      fetch: (async () => {
        fetches += 1;
        return new Response(
          JSON.stringify({ data: { count: 0, invoices: [] }, params: {} }),
          { status: 200 },
        );
      }) as unknown as typeof fetch,
    });

    function Reader() {
      const { error, isPending } = useInvoices();
      return <span>{error ? "error" : isPending ? "pending" : "ok"}</span>;
    }

    const at = (token?: string) => (
      <CompanyProvider companyClient={client} accessToken={token}>
        <Reader />
      </CompanyProvider>
    );
    const view = render(at("A"));
    await flush();
    expect(view.container.textContent).toBe("ok");

    view.rerender(at(undefined));
    await flush();
    expect(view.container.textContent).toBe("error");

    view.rerender(at("B"));
    await flush();
    expect(view.container.textContent).toBe("ok");
    expect(fetches).toBe(2);
  });

  it_("treat an explicitly-default query as the default one", async () => {
    // `{ includePending: false }` states the default rather than omitting it.
    // Keyed literally it would be a second row set: missing the prefetch seed
    // and refetching rows already on screen.
    const client = fakeClient({
      fetchInvoices: vi.fn(async () => rowsOf("inv_1")),
    });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CompanyProvider
        companyClient={client}
        initialData={{ invoices: page("inv_seed") }}
      >
        {children}
      </CompanyProvider>
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

  it_("leave a client-owned token alone even when a session is named", () => {
    // sessionKey travels with the token, so forwarding it on its own would
    // clear the token the host configured its client with.
    const client = fakeClient({ setAccessToken: vi.fn() });
    render(
      <CompanyProvider companyClient={client} sessionKey="company_1">
        <span />
      </CompanyProvider>,
    );
    expect(client.setAccessToken).not.toHaveBeenCalled();
  });

  it_("do not reset from a render when the token arrives late", async () => {
    // The render-phase install is only safe before the children subscribe.
    // A pass that forwarded nothing has still had its chance, so a token
    // arriving afterwards has to go through an effect.
    let notify: (() => void) | undefined;
    let held: unknown;
    const client = fakeClient({
      onCredentialsChange: (listener) => {
        notify = listener;
        return () => {
          notify = undefined;
        };
      },
      setAccessToken: (token) => {
        if (token !== held) {
          held = token;
          notify?.();
        }
      },
    });
    const errors: string[] = [];
    const spy = vi.spyOn(console, "error").mockImplementation((...args) => {
      errors.push(String(args[0]));
    });

    function Reader() {
      useInvoices();
      return <span />;
    }
    const view = render(
      <CompanyProvider companyClient={client}>
        <Reader />
      </CompanyProvider>,
    );
    await flush();
    view.rerender(
      <CompanyProvider companyClient={client} accessToken="later_token">
        <Reader />
      </CompanyProvider>,
    );
    await flush();
    spy.mockRestore();

    expect(
      errors.filter((e) => /while rendering a different component/.test(e)),
    ).toEqual([]);
    expect(held).toBe("later_token");
  });

  it_("leave a client-owned token alone when no prop is given", () => {
    const client = fakeClient({ setAccessToken: vi.fn() });
    const { rerender } = render(
      <CompanyProvider companyClient={client}>
        <span />
      </CompanyProvider>,
    );
    expect(client.setAccessToken).not.toHaveBeenCalled();
    rerender(
      <CompanyProvider companyClient={client} accessToken="t1">
        <span />
      </CompanyProvider>,
    );
    rerender(
      <CompanyProvider companyClient={client}>
        <span />
      </CompanyProvider>,
    );
    expect(client.setAccessToken).toHaveBeenNthCalledWith(1, "t1", undefined);
    expect(client.setAccessToken).toHaveBeenNthCalledWith(
      2,
      undefined,
      undefined,
    );
  });

  it_(
    "page invoices against the server count and append on loadMore",
    async () => {
      const rows = Array.from({ length: 30 }, (_, i) => invoice(`inv_${i}`));
      const client = fakeClient({ fetchInvoices: vi.fn(serve(rows)) });
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <CompanyProvider companyClient={client}>{children}</CompanyProvider>
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
      <CompanyProvider companyClient={client}>{children}</CompanyProvider>
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
      <CompanyProvider companyClient={client}>{children}</CompanyProvider>
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
        <CompanyProvider companyClient={client}>{children}</CompanyProvider>
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

  it_("empties the card when the session ends, without an error", async () => {
    // A reader who signed out is shown nothing, not a complaint: the store
    // clears rather than reloading into a client that will refuse to read.
    const client = fakeClient({
      fetchInvoices: vi.fn(async () => rowsOf("inv_1")),
    });
    let ended = false;
    Object.defineProperty(client, "sessionEnded", { get: () => ended });
    const { result } = renderHook(() => useInvoices(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <CompanyProvider companyClient={client}>{children}</CompanyProvider>
      ),
    });
    await flush();
    expect(result.current.data?.invoices).toHaveLength(1);

    ended = true;
    act(() => {
      client.listeners.forEach((listener) => listener());
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
    "stays empty for an element that mounts after the session ended",
    async () => {
      // The card on screen at sign-out is not the only one: a page opened
      // afterwards mounts a resource that has never loaded, and it must not
      // fetch its way into showing the client's refusal as an error.
      const client = fakeClient({
        fetchInvoices: vi.fn(async () => rowsOf("inv_1")),
      });
      Object.defineProperty(client, "sessionEnded", { get: () => true });
      const { result } = renderHook(() => useInvoices(), {
        wrapper: ({ children }: { children: React.ReactNode }) => (
          <CompanyProvider companyClient={client}>{children}</CompanyProvider>
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

  it_("swaps the session onto a client the host replaces", async () => {
    // The session is stated per client: one arriving without having heard
    // it would refetch the company just signed out of, under its own token.
    const first = fakeClient({ setSession: vi.fn() });
    const second = fakeClient({ setSession: vi.fn() });
    const view = render(
      <CompanyProvider companyClient={first} sessionKey={null}>
        <span />
      </CompanyProvider>,
    );
    await flush();
    expect(first.setSession).toHaveBeenLastCalledWith(null);

    view.rerender(
      <CompanyProvider companyClient={second} sessionKey={null}>
        <span />
      </CompanyProvider>,
    );
    await flush();
    expect(second.setSession).toHaveBeenLastCalledWith(null);
  });

  it_(
    "delivers a session to a client this provider gave no token",
    async () => {
      // A host that built its own client and supplied its own token: the only
      // thing this provider has to say is which company is being read.
      const setSession = vi.fn();
      const client = fakeClient({ setSession });
      const view = render(
        <CompanyProvider companyClient={client} sessionKey="company_a">
          <span />
        </CompanyProvider>,
      );
      await flush();
      expect(setSession).toHaveBeenLastCalledWith("company_a");

      view.rerender(
        <CompanyProvider companyClient={client} sessionKey={null}>
          <span />
        </CompanyProvider>,
      );
      await flush();
      expect(setSession).toHaveBeenLastCalledWith(null);
    },
  );

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
        <CompanyProvider companyClient={client}>{children}</CompanyProvider>
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
    const store = new CompanyStore(client, {}, 260);
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
    const store = new CompanyStore(client, {}, 260);
    store.invoices.get({}).subscribe(() => {});
    await flush();
    expect(store.invoices.get({}).snapshot.data?.invoices).toHaveLength(12);
    expect(client.fetchInvoices).toHaveBeenCalledTimes(2);
  });

  it_(
    "SchematicProvider provides the company hooks alongside flags",
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
        <SchematicProvider publishableKey="pk" companyClient={client}>
          <Probe />
        </SchematicProvider>,
      );
      expect(screen.getByText("pending")).toBeTruthy();
      await flush();
      expect(screen.getByText("inv_1")).toBeTruthy();
    },
  );

  it_(
    "CompanyDataProvider feeds the hooks from plain data with status overrides",
    () => {
      const onRefetch = vi.fn();
      const { result } = renderHook(() => useInvoices(), {
        wrapper: ({ children }) => (
          <CompanyDataProvider
            data={{ invoices: page("inv_1") }}
            status={{ invoices: { error: new Error("x") } }}
            onRefetch={onRefetch}
          >
            {children}
          </CompanyDataProvider>
        ),
      });
      expect(result.current).toMatchObject({ error: new Error("x") });
      expect(result.current.data?.invoices).toHaveLength(1);
      result.current.refetch();
      expect(onRefetch).toHaveBeenCalledWith("invoices");
    },
  );
});

describe("CompanyStore", () => {
  it("invalidateAll refetches only loaded resources", async () => {
    const client = fakeClient();
    const store = new CompanyStore(client);
    store.invalidateAll();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(client.fetchInvoices).not.toHaveBeenCalled();
    await store.invoices.get({}).load();
    store.invalidateAll();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(client.fetchInvoices).toHaveBeenCalledTimes(2);
  });
});
