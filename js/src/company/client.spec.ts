import { vi } from "vitest";

import {
  SchematicApiError,
  SchematicCompanyClient,
  fetchCompanyData,
} from "./client";

type Call = { url: string; headers: Record<string, string> };

function fakeFetch(
  respond: (
    url: string,
    headers: Record<string, string>,
  ) => {
    status?: number;
    body?: unknown;
  },
) {
  const calls: Call[] = [];
  const fetchImpl = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const headers = (init?.headers ?? {}) as Record<string, string>;
      calls.push({ url, headers });
      const { status = 200, body = {} } = respond(url, headers);
      return new Response(body === null ? "" : JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    },
  );
  return { calls, fetchImpl: fetchImpl as unknown as typeof fetch };
}

const wireInvoices = {
  data: {
    count: 1,
    invoices: [
      {
        id: "inv_1",
        amount_due: 100,
        currency: "usd",
        status: "paid",
        due_date: "2026-08-01T00:00:00Z",
        created_at: "2026-07-31T00:00:00Z",
        url: null,
      },
    ],
  },
};

/** An empty page in the shape the API sends one. */
const wireEmpty = { data: { count: 0, invoices: [] } };

describe("SchematicCompanyClient", () => {
  it("passes paging params and decodes invoice rows", async () => {
    const { calls, fetchImpl } = fakeFetch(() => ({ body: wireInvoices }));
    const client = new SchematicCompanyClient({
      session: { key: "company", token: "t" },
      fetch: fetchImpl,
    });
    const page = await client.fetchInvoices({ limit: 13, offset: 12 });
    expect(calls[0].url).toBe(
      "https://api.schematichq.com/company/invoices?limit=13&offset=12",
    );
    expect(calls[0].headers["X-Schematic-Api-Key"]).toBe("t");
    expect(page.count).toBe(1);
    expect(page.invoices[0].dueDate).toBeInstanceOf(Date);
    // The generated FromJSON maps wire nulls to undefined optionals.
    expect(page.invoices[0].amountDue).toBe(100);
    expect(page.invoices[0].url).toBeUndefined();
  });

  it("passes include_pending only when set", async () => {
    const { calls, fetchImpl } = fakeFetch(() => ({ body: wireInvoices }));
    const client = new SchematicCompanyClient({
      session: { key: "company", token: "t" },
      fetch: fetchImpl,
    });
    await client.fetchInvoices({ limit: 1, offset: 0, includePending: true });
    expect(calls[0].url).toBe(
      "https://api.schematichq.com/company/invoices?limit=1&offset=0&include_pending=true",
    );
  });

  it("resolves a token provider once and shares it across concurrent requests", async () => {
    const provider = vi.fn(async () => ({ token: "t1" }));
    const { calls, fetchImpl } = fakeFetch(() => ({ body: wireEmpty }));
    const client = new SchematicCompanyClient({
      session: { key: "company", token: provider },
      fetch: fetchImpl,
    });
    const page = { limit: 13, offset: 0 };
    await Promise.all([client.fetchInvoices(page), client.fetchInvoices(page)]);
    expect(provider).toHaveBeenCalledTimes(1);
    expect(calls.every((c) => c.headers["X-Schematic-Api-Key"] === "t1")).toBe(
      true,
    );
  });

  it("refreshes the token once after a 401 and retries", async () => {
    let n = 0;
    const provider = vi.fn(async () => `t${++n}`);
    const { calls, fetchImpl } = fakeFetch((_url, headers) =>
      headers["X-Schematic-Api-Key"] === "t1"
        ? { status: 401, body: { error: "expired" } }
        : { body: wireInvoices },
    );
    const client = new SchematicCompanyClient({
      session: { key: "company", token: provider },
      fetch: fetchImpl,
    });
    const page = await client.fetchInvoices({ limit: 1, offset: 0 });
    expect(page.invoices[0].id).toBe("inv_1");
    expect(calls).toHaveLength(2);
    expect(provider).toHaveBeenCalledTimes(2);
  });

  it("re-resolves an expired cached token before requesting", async () => {
    let n = 0;
    const provider = vi.fn(async () => ({
      token: `t${++n}`,
      expiresAt: new Date(Date.now() - 1000),
    }));
    const { calls, fetchImpl } = fakeFetch(() => ({ body: wireEmpty }));
    const client = new SchematicCompanyClient({
      session: { key: "company", token: provider },
      fetch: fetchImpl,
    });
    const page = { limit: 1, offset: 0 };
    await client.fetchInvoices(page);
    await client.fetchInvoices(page);
    expect(provider).toHaveBeenCalledTimes(2);
    expect(calls[1].headers["X-Schematic-Api-Key"]).toBe("t2");
  });

  it("does not retry a 401 with a string token; it surfaces the error", async () => {
    const { fetchImpl } = fakeFetch(() => ({
      status: 401,
      body: { error: "nope" },
    }));
    const client = new SchematicCompanyClient({
      session: { key: "company", token: "tok" },
      fetch: fetchImpl,
    });
    await expect(
      client.fetchInvoices({ limit: 1, offset: 0 }),
    ).rejects.toMatchObject({
      name: "SchematicApiError",
      status: 401,
      message: "nope",
    });
  });

  it("says a session started when the host first states one", () => {
    const client = new SchematicCompanyClient();
    const events: string[] = [];
    client.onSessionChange((event) => events.push(event.type));

    expect(client.sessionStatus).toBe("pending");
    client.setSession({ key: "company_a", token: "t1" });
    expect(client.sessionStatus).toBe("active");
    expect(events).toEqual(["started"]);
  });

  it("says nothing about a session the host has not resolved yet", () => {
    // Every async auth renders once before it knows. Reading that as a
    // change would drop the rows it just loaded.
    const client = new SchematicCompanyClient({
      session: { key: "company_a", token: "t1" },
    });
    const events: string[] = [];
    client.onSessionChange((event) => events.push(event.type));

    client.setSession(undefined);
    expect(events).toEqual([]);
    expect(client.sessionStatus).toBe("active");
  });

  it("treats a rebuilt token closure for the same key as the same session", async () => {
    // The documented shape: `token: async () => …` written inline, so the
    // function is new on every render while the company is not.
    const { calls, fetchImpl } = fakeFetch(() => ({ body: wireInvoices }));
    let issued = 0;
    const mint = async () => `t${++issued}`;
    const client = new SchematicCompanyClient({
      session: { key: "company_a", token: mint },
      fetch: fetchImpl,
    });
    const events: string[] = [];
    client.onSessionChange((event) => events.push(event.type));

    await client.fetchInvoices({ limit: 1, offset: 0 });
    client.setSession({ key: "company_a", token: async () => `t${++issued}` });
    await client.fetchInvoices({ limit: 1, offset: 0 });

    expect(events).toEqual([]);
    expect(calls.map((call) => call.headers["X-Schematic-Api-Key"])).toEqual([
      "t1",
      "t1",
    ]);
  });

  it("says a session changed when the key does", () => {
    const client = new SchematicCompanyClient({
      session: { key: "company_a", token: "t1" },
    });
    const events: string[] = [];
    client.onSessionChange((event) => events.push(event.type));

    client.setSession({ key: "company_b", token: "t1" });
    expect(events).toEqual(["changed"]);
  });

  it("does not read its own token refresh as a new session", async () => {
    // Comparing token values would make every expiry look like a different
    // company and drop every loaded resource.
    let issued = 0;
    const client = new SchematicCompanyClient({
      session: {
        key: "company",
        token: async () => ({
          token: `t${++issued}`,
          expiresAt: new Date(Date.now() - 1),
        }),
      },
      fetch: fakeFetch(() => ({ body: wireInvoices })).fetchImpl,
    });
    const listener = vi.fn();
    client.onSessionChange(listener);

    await client.fetchInvoices({ limit: 1, offset: 0 });
    await client.fetchInvoices({ limit: 1, offset: 0 });
    await client.fetchInvoices({ limit: 1, offset: 0 });

    expect(issued).toBeGreaterThan(1);
    expect(listener).not.toHaveBeenCalled();
  });

  it("still refreshes a 401 when the host restates the same session", async () => {
    // The session object is new every render while the company is not.
    // Comparing objects would hand the reader the 401 instead of retrying.
    let issued = 0;
    const mint = async () => `t${++issued}`;
    const { calls, fetchImpl } = fakeFetch((_url, headers) =>
      headers["X-Schematic-Api-Key"] === "t1"
        ? { status: 401, body: { error: "expired" } }
        : { body: wireEmpty },
    );
    const client = new SchematicCompanyClient({
      session: { key: "company_a", token: mint },
      fetch: fetchImpl,
    });

    const request = client.fetchInvoices({ limit: 1, offset: 0 });
    // The re-render lands while the request is on the wire.
    client.setSession({ key: "company_a", token: mint });
    await expect(request).resolves.toMatchObject({ count: 0 });
    expect(calls).toHaveLength(2);
  });

  it("keeps a resolved token through a restatement of the same session", async () => {
    // Same reason on the caching side: a resolution that lands after a
    // re-render still belongs to this session, and discarding it would ask
    // the token endpoint again on every render.
    let issued = 0;
    const mint = async () => `t${++issued}`;
    const { calls, fetchImpl } = fakeFetch(() => ({ body: wireEmpty }));
    const client = new SchematicCompanyClient({
      session: { key: "company_a", token: mint },
      fetch: fetchImpl,
    });

    const request = client.fetchInvoices({ limit: 1, offset: 0 });
    client.setSession({ key: "company_a", token: mint });
    await request;
    await client.fetchInvoices({ limit: 1, offset: 0 });

    expect(issued).toBe(1);
    expect(calls.map((call) => call.headers["X-Schematic-Api-Key"])).toEqual([
      "t1",
      "t1",
    ]);
  });

  it("abandons the retry when the company changes while the body drains", async () => {
    // The window between the 401 arriving and its body being read. Landing
    // the change from inside `text()` is what puts it there — stating it any
    // earlier takes the guard before this one.
    const sent: string[] = [];
    let client: SchematicCompanyClient | undefined;
    const fetchImpl = (async (
      _url: string,
      init: { headers: Record<string, string> },
    ) => {
      sent.push(init.headers["X-Schematic-Api-Key"]);
      const response = new Response(JSON.stringify({ error: "expired" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
      const text = response.text.bind(response);
      Object.defineProperty(response, "text", {
        value: async () => {
          const body = await text();
          client?.setSession({ key: "company_b", token: "t_b" });
          return body;
        },
      });
      return response;
    }) as unknown as typeof fetch;
    client = new SchematicCompanyClient({
      session: { key: "company_a", token: async () => "t_a" },
      fetch: fetchImpl,
    });

    // The 401 is what this request gets: its retry belonged to a company
    // that is no longer being read. Not a TypeError from a body read twice.
    const error = await client
      .fetchInvoices({ limit: 1, offset: 0 })
      .catch((cause: unknown) => cause);
    expect(error).toBeInstanceOf(SchematicApiError);
    expect(error).toMatchObject({ status: 401, body: { error: "expired" } });
    expect(sent).toEqual(["t_a"]);
  });

  it("abandons the retry when the company changes while the token mints", async () => {
    // The other window: the forced refresh is a round trip to the host's own
    // token endpoint, and a reader can switch organizations during it.
    const sent: string[] = [];
    let client: SchematicCompanyClient | undefined;
    let minted = 0;
    const mint = async () => {
      if (++minted > 1) {
        client?.setSession({ key: "company_b", token: "t_b" });
      }
      return `t_a${minted}`;
    };
    const fetchImpl = (async (
      _url: string,
      init: { headers: Record<string, string> },
    ) => {
      sent.push(init.headers["X-Schematic-Api-Key"]);
      return new Response(JSON.stringify({ error: "expired" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }) as unknown as typeof fetch;
    client = new SchematicCompanyClient({
      session: { key: "company_a", token: mint },
      fetch: fetchImpl,
    });

    const error = await client
      .fetchInvoices({ limit: 1, offset: 0 })
      .catch((cause: unknown) => cause);
    expect(error).toBeInstanceOf(SchematicApiError);
    expect(error).toMatchObject({ status: 401 });
    expect(sent).toEqual(["t_a1"]);
  });

  it("stops serving the token a 401 has already rejected", async () => {
    // A request resolving alongside a forced refresh would take the rejected
    // token from the cache, 401 in its turn, and force a refresh of its own.
    let issued = 0;
    const mint = async () => `t${++issued}`;
    const sent: string[] = [];
    const fetchImpl = (async (
      _url: string,
      init: { headers: Record<string, string> },
    ) => {
      const key = init.headers["X-Schematic-Api-Key"];
      sent.push(key);
      return key === "t1"
        ? new Response(JSON.stringify({ error: "expired" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          })
        : new Response(JSON.stringify({ data: { count: 0, invoices: [] } }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
    }) as unknown as typeof fetch;
    const client = new SchematicCompanyClient({
      session: { key: "company_a", token: mint },
      fetch: fetchImpl,
    });

    await client.fetchInvoices({ limit: 1, offset: 0 });
    await client.fetchInvoices({ limit: 1, offset: 0 });
    expect(sent.filter((token) => token === "t1")).toHaveLength(1);
  });

  it("refreshes a 401 through the token the session says now", async () => {
    // A host whose token function closes over a value rather than minting on
    // each call restates the same company to hand over a fresher one.
    // setSession keeps the session — only what the next resolution calls
    // changed — so the retry has to ask what it left, not the closure this
    // request captured, or it re-sends the token the API just rejected.
    const sent: string[] = [];
    const fetchImpl = vi.fn(
      async (_input, init: { headers: Record<string, string> }) => {
        const key = init.headers["X-Schematic-Api-Key"];
        sent.push(key);
        return key === "stale"
          ? new Response(JSON.stringify({ error: "expired" }), {
              status: 401,
              headers: { "Content-Type": "application/json" },
            })
          : new Response(JSON.stringify({ data: { count: 0, invoices: [] } }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
      },
    ) as unknown as typeof fetch;

    const client = new SchematicCompanyClient({
      session: { key: "company", token: async () => "stale" },
      fetch: fetchImpl,
    });
    const request = client.fetchInvoices({ limit: 1, offset: 0 });
    client.setSession({ key: "company", token: async () => "fresh" });

    await expect(request).resolves.toEqual({ count: 0, invoices: [] });
    expect(sent).toEqual(["stale", "fresh"]);
  });

  it("survives a logout landing mid-request", async () => {
    const { fetchImpl, calls } = fakeFetch(() => ({
      status: 401,
      body: { error: "expired" },
    }));
    const client = new SchematicCompanyClient({
      session: { key: "company", token: async () => "t1" },
      fetch: fetchImpl,
    });
    const request = client.fetchInvoices({ limit: 1, offset: 0 });
    client.setSession(null);
    // The session ended while the token was minting, so the request is
    // abandoned rather than sent: a reader who signed out is owed no call
    // carrying the credential they signed out of.
    await expect(request).rejects.toThrow(
      "The session changed before this request was sent.",
    );
    expect(calls).toHaveLength(0);
  });

  it("abandons a request whose company changed while the token minted", async () => {
    const { fetchImpl, calls } = fakeFetch(() => ({
      body: { data: { count: 0, invoices: [] } },
    }));
    const client = new SchematicCompanyClient({
      session: { key: "company_a", token: async () => "t_a" },
      fetch: fetchImpl,
    });
    const request = client.fetchInvoices({ limit: 1, offset: 0 });
    client.setSession({ key: "company_b", token: async () => "t_b" });
    // Answering it would hand company B's rows back as the answer to a
    // question asked for company A.
    await expect(request).rejects.toThrow(
      "The session changed before this request was sent.",
    );
    expect(calls).toHaveLength(0);
  });

  it("declines a token stamped for another company", async () => {
    const { fetchImpl, calls } = fakeFetch(() => ({
      body: { data: { count: 0, invoices: [] } },
    }));
    const client = new SchematicCompanyClient({
      // What a provider reading a session the client has not been told about
      // yet hands back: the next company's token, stamped as its own.
      session: {
        key: "company_a",
        token: async () => ({ token: "t_b", sessionKey: "company_b" }),
      },
      fetch: fetchImpl,
    });
    await expect(client.fetchInvoices({ limit: 1, offset: 0 })).rejects.toThrow(
      "token for a different company",
    );
    expect(calls).toHaveLength(0);
  });

  it("takes a token body the way a host actually returns one", async () => {
    // The documented usage is `(await fetch("/api/access-token")).json()`, so
    // `expiresAt` arrives as a JSON string. Adopted verbatim it survives the
    // first request and throws on the second.
    const { calls, fetchImpl } = fakeFetch(() => ({ body: wireInvoices }));
    const client = new SchematicCompanyClient({
      session: {
        key: "company",
        token: async () => ({
          token: "t1",
          expiresAt: "2099-01-01T00:00:00Z",
        }),
      },
      fetch: fetchImpl,
    });
    await client.fetchInvoices({ limit: 1, offset: 0 });
    await client.fetchInvoices({ limit: 1, offset: 0 });
    expect(calls.map((call) => call.headers["X-Schematic-Api-Key"])).toEqual([
      "t1",
      "t1",
    ]);
  });

  it("treats an unreadable expiry as none rather than failing", async () => {
    const { fetchImpl } = fakeFetch(() => ({ body: wireInvoices }));
    const client = new SchematicCompanyClient({
      session: {
        key: "company",
        token: async () => ({ token: "t1", expiresAt: "not a date" }),
      },
      fetch: fetchImpl,
    });
    await expect(
      client.fetchInvoices({ limit: 1, offset: 0 }),
    ).resolves.toMatchObject({ count: 1 });
    await expect(
      client.fetchInvoices({ limit: 1, offset: 0 }),
    ).resolves.toMatchObject({ count: 1 });
  });

  it("reports a provider that returned no token", async () => {
    const { fetchImpl } = fakeFetch(() => ({ body: wireInvoices }));
    const client = new SchematicCompanyClient({
      // A body whose token is under another key: without a check this sends
      // `X-Schematic-Api-Key: undefined`.
      session: {
        key: "company",
        token: async () => ({ accessToken: "t1" }) as never,
      },
      fetch: fetchImpl,
    });
    await expect(client.fetchInvoices({ limit: 1, offset: 0 })).rejects.toThrow(
      /did not return a token/,
    );
  });

  it("ends the session when the host says there is nobody", async () => {
    // Sign-out. The token prop may still be in hand and the endpoint behind
    // it may still mint for the company being left, so an ended session
    // reads nothing at all.
    const { fetchImpl } = fakeFetch(() => ({ body: wireEmpty }));
    const client = new SchematicCompanyClient({
      session: { key: "company_a", token: "t1" },
      fetch: fetchImpl,
    });
    const events: string[] = [];
    client.onSessionChange((event) => events.push(event.type));

    client.setSession(null);
    expect(events).toEqual(["ended"]);
    expect(client.sessionStatus).toBe("ended");
    await expect(client.fetchInvoices({ limit: 1, offset: 0 })).rejects.toThrow(
      /no session/,
    );

    // Repeating it says nothing; there is nothing left to end.
    client.setSession(null);
    expect(events).toEqual(["ended"]);
  });

  it("ends a session the host never named, when auth resolves to nobody", () => {
    // Pending, then `null`: the shape an auth produces for a visitor who is
    // not signed in. Anything seeded for that page belongs to nobody.
    const client = new SchematicCompanyClient();
    const events: string[] = [];
    client.onSessionChange((event) => events.push(event.type));

    client.setSession(null);
    expect(events).toEqual(["ended"]);
  });

  it("starts again when someone signs in after a sign-out", async () => {
    const { calls, fetchImpl } = fakeFetch(() => ({ body: wireEmpty }));
    const client = new SchematicCompanyClient({
      session: { key: "company_a", token: "t_a" },
      fetch: fetchImpl,
    });
    const events: string[] = [];
    client.onSessionChange((event) => events.push(event.type));

    client.setSession(null);
    client.setSession({ key: "company_b", token: "t_b" });
    expect(events).toEqual(["ended", "started"]);
    await expect(
      client.fetchInvoices({ limit: 1, offset: 0 }),
    ).resolves.toMatchObject({ count: 0 });
    expect(calls[0].headers["X-Schematic-Api-Key"]).toBe("t_b");
  });

  it("reports a read with no session at all", async () => {
    const client = new SchematicCompanyClient();
    await expect(client.fetchInvoices({ limit: 1, offset: 0 })).rejects.toThrow(
      /session is required/,
    );
  });

  it("does not serve a resolution that belongs to the session being left", async () => {
    // A provider answering after the host moved on: its token was minted for
    // the company that has been left, and adopting it would send it as this
    // one's.
    let release: ((token: string) => void) | undefined;
    const slow = () =>
      new Promise<string>((resolve) => {
        release = resolve;
      });
    const { calls, fetchImpl } = fakeFetch(() => ({ body: wireEmpty }));
    const client = new SchematicCompanyClient({
      session: { key: "company_a", token: slow },
      fetch: fetchImpl,
    });

    const first = client.fetchInvoices({ limit: 1, offset: 0 });
    // The provider runs on a microtask, so its release hook exists a tick in.
    await Promise.resolve();
    client.setSession({ key: "company_b", token: "t_b" });
    release?.("t_a");
    await first.catch(() => undefined);

    await client.fetchInvoices({ limit: 1, offset: 0 });
    expect(calls[calls.length - 1].headers["X-Schematic-Api-Key"]).toBe("t_b");
  });

  it("asks the provider again on a 401 rather than reusing what it has", async () => {
    // The cached token is the one the API has just rejected, so the forced
    // resolution has to bypass both the cache and any resolution that
    // started before the rejection.
    let calls = 0;
    const provider = () => Promise.resolve(++calls === 1 ? "stale" : "fresh");
    const { calls: sent, fetchImpl } = fakeFetch((_url, headers) =>
      headers["X-Schematic-Api-Key"] === "fresh"
        ? { body: wireInvoices }
        : { status: 401, body: { error: "expired" } },
    );
    const client = new SchematicCompanyClient({
      session: { key: "company", token: provider },
      fetch: fetchImpl,
    });

    await expect(
      client.fetchInvoices({ limit: 1, offset: 0 }),
    ).resolves.toMatchObject({ count: 1 });
    expect(calls).toBe(2);
    expect(sent.map((call) => call.headers["X-Schematic-Api-Key"])).toEqual([
      "stale",
      "fresh",
    ]);
  });

  it("reads no invoices from a null page or a null row array", async () => {
    // The API sends `[]` for an empty history, but a null from anywhere in
    // the chain reads as no invoices rather than throwing in the decoder.
    for (const body of [
      { data: null },
      { data: { count: 0, invoices: null } },
    ]) {
      const { fetchImpl } = fakeFetch(() => ({ body }));
      const client = new SchematicCompanyClient({
        session: { key: "company", token: "t" },
        fetch: fetchImpl,
      });
      await expect(
        client.fetchInvoices({ limit: 1, offset: 0 }),
      ).resolves.toEqual({ invoices: [], count: 0 });
    }
  });

  it("never asks for a page larger than the API serves", async () => {
    const { calls, fetchImpl } = fakeFetch(() => ({ body: wireEmpty }));
    const client = new SchematicCompanyClient({
      session: { key: "company", token: "t" },
      fetch: fetchImpl,
    });
    await client.fetchInvoices({ limit: 4000, offset: 0 });
    expect(calls[0].url).toContain("limit=250");
  });

  it("reports a malformed body rather than throwing a TypeError", async () => {
    const { fetchImpl } = fakeFetch(() => ({ body: null }));
    const client = new SchematicCompanyClient({
      session: { key: "company", token: "t" },
      fetch: fetchImpl,
    });
    await expect(client.fetchInvoices({ limit: 1, offset: 0 })).rejects.toThrow(
      /Malformed response/,
    );
  });

  it("throws SchematicApiError with the body for other failures", async () => {
    const { fetchImpl } = fakeFetch(() => ({ status: 500, body: "oops" }));
    const client = new SchematicCompanyClient({
      session: { key: "company", token: "t" },
      fetch: fetchImpl,
    });
    const error = await client
      .fetchInvoices({ limit: 1, offset: 0 })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(SchematicApiError);
    expect(error).toMatchObject({
      status: 500,
      body: "oops",
      path: "/company/invoices?limit=1&offset=0",
    });
  });
});

describe("fetchCompanyData", () => {
  it("prefetches the query it is asked for, and says which it was", async () => {
    // Seeded under the defaults, a prefetch for another query is read by
    // nobody: the element asking that query fetches the same page again.
    const { calls, fetchImpl } = fakeFetch(() => ({ body: wireEmpty }));
    const client = new SchematicCompanyClient({
      session: { key: "company", token: "t" },
      fetch: fetchImpl,
    });
    const data = await fetchCompanyData(client, {
      invoices: { includePending: true },
    });
    expect(calls[0].url).toContain("include_pending=true");
    expect(data.params).toEqual({ invoices: { includePending: true } });
  });

  it("prefetches invoices as a page and skips failures", async () => {
    const { fetchImpl } = fakeFetch(() => ({
      body: {
        data: {
          count: 84,
          invoices: Array.from({ length: 12 }, (_, i) => ({ id: `i${i}` })),
        },
      },
    }));
    const client = new SchematicCompanyClient({
      session: { key: "company", token: "t" },
      fetch: fetchImpl,
    });
    const data = await fetchCompanyData(client);
    expect(data.invoices).toMatchObject({ count: 84, hasMore: true });
    expect(data.invoices?.invoices).toHaveLength(12);

    const { fetchImpl: failing } = fakeFetch(() => ({
      status: 500,
      body: "x",
    }));
    const empty = await fetchCompanyData(
      new SchematicCompanyClient({
        session: { key: "company", token: "t" },
        fetch: failing,
      }),
    );
    expect(empty.invoices).toBeUndefined();
  });
});
