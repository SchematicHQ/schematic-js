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
      accessToken: "t",
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
      accessToken: "t",
      fetch: fetchImpl,
    });
    await client.fetchInvoices({ limit: 1, offset: 0, includePending: true });
    expect(calls[0].url).toBe(
      "https://api.schematichq.com/company/invoices?limit=1&offset=0&include_pending=true",
    );
  });

  it("rejects company reads without a token", async () => {
    const { fetchImpl } = fakeFetch(() => ({}));
    await expect(
      new SchematicCompanyClient({ fetch: fetchImpl }).fetchInvoices({
        limit: 1,
        offset: 0,
      }),
    ).rejects.toThrow(/access token/);
  });

  it("resolves a token provider once and shares it across concurrent requests", async () => {
    const provider = vi.fn(async () => ({ token: "t1" }));
    const { calls, fetchImpl } = fakeFetch(() => ({ body: wireEmpty }));
    const client = new SchematicCompanyClient({
      accessToken: provider,
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
      accessToken: provider,
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
      accessToken: provider,
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
      accessToken: "tok",
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

  it("notifies listeners only when the credential actually changes", () => {
    const client = new SchematicCompanyClient({ accessToken: "a" });
    const listener = vi.fn();
    const unsubscribe = client.onCredentialsChange(listener);
    client.setAccessToken("a");
    expect(listener).not.toHaveBeenCalled();
    client.setAccessToken("b");
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    client.setAccessToken(undefined);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("treats a replaced provider function as the same session", async () => {
    // The documented usage is an inline arrow, so the host hands over a new
    // function on every render. None of them is a new session.
    const { calls, fetchImpl } = fakeFetch(() => ({ body: wireInvoices }));
    const client = new SchematicCompanyClient({
      accessToken: async () => "t1",
      fetch: fetchImpl,
    });
    const listener = vi.fn();
    client.onCredentialsChange(listener);

    await client.fetchInvoices({ limit: 1, offset: 0 });
    for (let i = 0; i < 3; i++) {
      client.setAccessToken(async () => "t1");
      await client.fetchInvoices({ limit: 1, offset: 0 });
    }
    expect(listener).not.toHaveBeenCalled();
    expect(calls).toHaveLength(4);
    expect(
      calls.every((call) => call.headers["X-Schematic-Api-Key"] === "t1"),
    ).toBe(true);
  });

  it("reports a session change when a provider resolves a new token", () => {
    // What identifies the session is the token, so this is the signal a
    // provider swap does not give.
    const tokens = ["t1", "t2"];
    const client = new SchematicCompanyClient({
      accessToken: async () => tokens.shift() ?? "t2",
      fetch: fakeFetch(() => ({ body: wireInvoices })).fetchImpl,
    });
    const listener = vi.fn();
    client.onCredentialsChange(listener);

    return client
      .fetchInvoices({ limit: 1, offset: 0 })
      .then(() => {
        // The first resolution replaces nothing, so it is not a change.
        expect(listener).not.toHaveBeenCalled();
        client.setAccessToken(async () => "t2");
        return client.fetchInvoices({ limit: 1, offset: 0 });
      })
      .then(() => {
        expect(listener).toHaveBeenCalledTimes(1);
      });
  });

  it("does not read its own token refresh as a new session", async () => {
    // A token endpoint mints a fresh string per call. Comparing values alone
    // would make every expiry look like a different company and drop every
    // loaded resource.
    let issued = 0;
    const client = new SchematicCompanyClient({
      accessToken: async () => ({
        token: `t${++issued}`,
        expiresAt: new Date(Date.now() - 1),
      }),
      fetch: fakeFetch(() => ({ body: wireInvoices })).fetchImpl,
    });
    const listener = vi.fn();
    client.onCredentialsChange(listener);

    await client.fetchInvoices({ limit: 1, offset: 0 });
    await client.fetchInvoices({ limit: 1, offset: 0 });
    await client.fetchInvoices({ limit: 1, offset: 0 });

    expect(issued).toBeGreaterThan(1);
    expect(listener).not.toHaveBeenCalled();
  });

  it("takes a named session change at face value", async () => {
    // The signal for what the client cannot see for itself: a provider
    // swapped to point at a different company.
    const { calls, fetchImpl } = fakeFetch(() => ({ body: wireInvoices }));
    const client = new SchematicCompanyClient({
      accessToken: async () => "t1",
      fetch: fetchImpl,
    });
    const listener = vi.fn();
    client.onCredentialsChange(listener);

    client.setAccessToken(async () => "t1", "company_a");
    await client.fetchInvoices({ limit: 1, offset: 0 });
    expect(listener).not.toHaveBeenCalled();

    // Same provider behaviour, different session: reported without waiting
    // for a resolution to prove it, and the token in hand is dropped.
    client.setAccessToken(async () => "t2", "company_b");
    expect(listener).toHaveBeenCalledTimes(1);
    await client.fetchInvoices({ limit: 1, offset: 0 });
    expect(calls[calls.length - 1].headers["X-Schematic-Api-Key"]).toBe("t2");
  });

  it("does not adopt a resolution that belongs to the session being left", async () => {
    // The switch happens while the first company's token is still on the
    // wire; adopting it would send the next request for company B with
    // company A's credential.
    const sent: string[] = [];
    let release: ((token: string) => void) | undefined;
    let calls = 0;
    // One provider identity for the life of the client, as CompanyProvider
    // forwards it.
    const provider = () => {
      calls += 1;
      return calls === 1
        ? new Promise<string>((resolve) => {
            release = resolve;
          })
        : Promise.resolve("token_b");
    };
    const client = new SchematicCompanyClient({
      fetch: (async (_input: unknown, init: RequestInit) => {
        sent.push(
          (init.headers as Record<string, string>)["X-Schematic-Api-Key"],
        );
        return new Response(JSON.stringify(wireInvoices), { status: 200 });
      }) as unknown as typeof fetch,
    });

    client.setAccessToken(provider, "company_a");
    const first = client.fetchInvoices({ limit: 1, offset: 0 });
    await new Promise((resolve) => setTimeout(resolve, 0));
    client.setAccessToken(provider, "company_b");
    release!("token_a");
    await first;

    await client.fetchInvoices({ limit: 1, offset: 0 });
    expect(calls).toBe(2);
    expect(sent[sent.length - 1]).toBe("token_b");
  });

  it("survives a logout landing mid-request", async () => {
    // The 401 branch straddles an await; re-reading the token there would
    // call `undefined` as a provider instead of failing cleanly.
    const { fetchImpl } = fakeFetch(() => ({
      status: 401,
      body: { error: "expired" },
    }));
    const client = new SchematicCompanyClient({
      accessToken: async () => "t1",
      fetch: fetchImpl,
    });
    const request = client.fetchInvoices({ limit: 1, offset: 0 });
    client.setAccessToken(undefined);
    // The 401 surfaces as an API error; re-reading the cleared token would
    // instead call `undefined` as a provider.
    await expect(request).rejects.toBeInstanceOf(SchematicApiError);
  });

  it("takes a token body the way a host actually returns one", async () => {
    // The documented usage is `(await fetch("/api/access-token")).json()`, so
    // `expiresAt` arrives as a JSON string. Adopted verbatim it survives the
    // first request and throws on the second.
    const { calls, fetchImpl } = fakeFetch(() => ({ body: wireInvoices }));
    const client = new SchematicCompanyClient({
      accessToken: async () => ({
        token: "t1",
        expiresAt: "2099-01-01T00:00:00Z",
      }),
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
      accessToken: async () => ({ token: "t1", expiresAt: "not a date" }),
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
      accessToken: async () => ({ accessToken: "t1" }) as never,
      fetch: fetchImpl,
    });
    await expect(client.fetchInvoices({ limit: 1, offset: 0 })).rejects.toThrow(
      /did not return a token/,
    );
  });

  it("does not read the first named session as a change", () => {
    const client = new SchematicCompanyClient({ accessToken: "t1" });
    const listener = vi.fn();
    client.onCredentialsChange(listener);
    client.setAccessToken("t1", "company_a");
    expect(listener).not.toHaveBeenCalled();
  });

  it("does not read a session named late as a change", () => {
    // What every async auth does: one render before the org id resolves, one
    // after. Reading that as a new session drops the rows already loaded and
    // fetches them again.
    const provider = async () => "t1";
    const client = new SchematicCompanyClient({ accessToken: provider });
    const listener = vi.fn();
    client.onCredentialsChange(listener);
    client.setAccessToken(provider, undefined);
    client.setAccessToken(provider, "company_a");
    expect(listener).not.toHaveBeenCalled();

    // A different name still is one.
    client.setAccessToken(provider, "company_b");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("tells a signed-out session apart from one not yet known", async () => {
    // Three states: a name, `null` for none, and `undefined` for not yet.
    // The middle one is sign-out and the last one is any async auth's first
    // render, and reading them the same way breaks one or the other.
    const provider = async () => "t1";
    const client = new SchematicCompanyClient({
      accessToken: provider,
      fetch: fakeFetch(() => ({ body: wireEmpty })).fetchImpl,
    });
    const listener = vi.fn();
    client.onCredentialsChange(listener);

    client.setAccessToken(provider, undefined);
    client.setAccessToken(provider, "company_a");
    // A flicker back to "not yet" says nothing about the session.
    client.setAccessToken(provider, undefined);
    client.setAccessToken(provider, "company_a");
    expect(listener).not.toHaveBeenCalled();

    // Signed out.
    client.setAccessToken(provider, null);
    expect(listener).toHaveBeenCalledTimes(1);
    // And an ended session reads nothing, whatever its token prop still says.
    await expect(client.fetchInvoices({ limit: 1, offset: 0 })).rejects.toThrow(
      /session has ended/,
    );

    // Signed back in as someone else: a change from the session that ended.
    client.setAccessToken(provider, "company_b");
    expect(listener).toHaveBeenCalledTimes(2);
    await expect(
      client.fetchInvoices({ limit: 1, offset: 0 }),
    ).resolves.toMatchObject({ count: 0 });
  });

  it("ends a session that was never named, when auth resolves to nobody", () => {
    // The shape every async auth produces on sign-out: nothing stated while
    // it loads, then `null`. The rows on screen — seeded, or loaded under a
    // token the host had already — belong to no one now.
    const provider = async () => "t1";
    const client = new SchematicCompanyClient({ accessToken: provider });
    const listener = vi.fn();
    client.onCredentialsChange(listener);
    client.setAccessToken(provider, undefined);
    client.setAccessToken(provider, null);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("reads again once a fresh token arrives, named or not", async () => {
    // Signing back in without naming a session: handing over a credential
    // is a statement of its own, and the client would otherwise refuse to
    // read for the life of the page.
    const { fetchImpl } = fakeFetch(() => ({ body: wireEmpty }));
    const client = new SchematicCompanyClient({
      accessToken: "t_old",
      fetch: fetchImpl,
    });
    client.setAccessToken("t_old", "company_a");
    client.setAccessToken("t_old", null);
    await expect(client.fetchInvoices({ limit: 1, offset: 0 })).rejects.toThrow(
      /session has ended/,
    );

    client.setAccessToken("t_new");
    await expect(
      client.fetchInvoices({ limit: 1, offset: 0 }),
    ).resolves.toMatchObject({ count: 0 });
  });

  it("tells listeners when a fresh token revives an ended session", () => {
    // The store emptied at sign-out and is waiting to hear it can load
    // again. A provider function is never adopted, and a string replacing
    // nothing is adopted silently, so neither path reports this on its own.
    for (const revive of ["t_new", async () => "t_new"] as const) {
      const provider = async () => "t_old";
      const client = new SchematicCompanyClient({ accessToken: provider });
      const listener = vi.fn();
      client.onCredentialsChange(listener);
      client.setAccessToken(provider, "company_a");
      client.setAccessToken(provider, null);
      expect(listener).toHaveBeenCalledTimes(1);

      client.setAccessToken(revive);
      expect(listener).toHaveBeenCalledTimes(2);
    }
  });

  it("ends the session when the host says there is none", () => {
    // Sign-out: the host keeps handing over the same token fetcher and says
    // the session is gone. The rows of the company signed out of cannot stay
    // on screen, so this is a change even though the token prop is identical.
    const provider = async () => "t1";
    const client = new SchematicCompanyClient({ accessToken: provider });
    const listener = vi.fn();
    client.onCredentialsChange(listener);
    client.setAccessToken(provider, "company_a");
    expect(listener).not.toHaveBeenCalled();

    client.setAccessToken(provider, null);
    expect(listener).toHaveBeenCalledTimes(1);

    // Signing back in as the same company is a change from the ended one.
    client.setAccessToken(provider, "company_a");
    expect(listener).toHaveBeenCalledTimes(2);
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
      accessToken: provider,
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
        accessToken: "t",
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
      accessToken: "t",
      fetch: fetchImpl,
    });
    await client.fetchInvoices({ limit: 4000, offset: 0 });
    expect(calls[0].url).toContain("limit=250");
  });

  it("reports a malformed body rather than throwing a TypeError", async () => {
    const { fetchImpl } = fakeFetch(() => ({ body: null }));
    const client = new SchematicCompanyClient({
      accessToken: "t",
      fetch: fetchImpl,
    });
    await expect(client.fetchInvoices({ limit: 1, offset: 0 })).rejects.toThrow(
      /Malformed response/,
    );
  });

  it("throws SchematicApiError with the body for other failures", async () => {
    const { fetchImpl } = fakeFetch(() => ({ status: 500, body: "oops" }));
    const client = new SchematicCompanyClient({
      accessToken: "t",
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
      accessToken: "t",
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
      new SchematicCompanyClient({ accessToken: "t", fetch: failing }),
    );
    expect(empty.invoices).toBeUndefined();
  });
});
