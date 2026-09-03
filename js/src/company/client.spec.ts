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
      // `null` rather than "": a 204 may not carry a body at all, and the
      // Response constructor rejects an empty string as one.
      return new Response(body === null ? null : JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    },
  );
  return { calls, fetchImpl: fetchImpl as unknown as typeof fetch };
}

const wireUpcoming = {
  data: {
    amount_due: 6800,
    currency: "usd",
    customer_balance_applied: 1500,
    customer_balance_remaining: 0,
    discounts: [],
    due_date: "2026-09-15T00:00:00Z",
    subtotal: 8300,
  },
};

const wireInvoices = {
  data: [
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
};

describe("SchematicCompanyClient", () => {
  it("passes paging params and decodes invoice rows", async () => {
    const { calls, fetchImpl } = fakeFetch(() => ({ body: wireInvoices }));
    const client = new SchematicCompanyClient({
      accessToken: "t",
      fetch: fetchImpl,
    });
    const rows = await client.fetchInvoices({ limit: 13, offset: 12 });
    expect(calls[0].url).toBe(
      "https://api.schematichq.com/company/invoices?limit=13&offset=12",
    );
    expect(calls[0].headers["X-Schematic-Api-Key"]).toBe("t");
    expect(rows[0].dueDate).toBeInstanceOf(Date);
    // The generated FromJSON maps wire nulls to undefined optionals.
    expect(rows[0].amountDue).toBe(100);
    expect(rows[0].url).toBeUndefined();
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
    const { calls, fetchImpl } = fakeFetch(() => ({ body: { data: [] } }));
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
    const rows = await client.fetchInvoices({ limit: 1, offset: 0 });
    expect(rows[0].id).toBe("inv_1");
    expect(calls).toHaveLength(2);
    expect(provider).toHaveBeenCalledTimes(2);
  });

  it("re-resolves an expired cached token before requesting", async () => {
    let n = 0;
    const provider = vi.fn(async () => ({
      token: `t${++n}`,
      expiresAt: new Date(Date.now() - 1000),
    }));
    const { calls, fetchImpl } = fakeFetch(() => ({ body: { data: [] } }));
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
    ).resolves.toHaveLength(1);
    await expect(
      client.fetchInvoices({ limit: 1, offset: 0 }),
    ).resolves.toHaveLength(1);
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
    ).resolves.toHaveLength(1);
    expect(calls).toBe(2);
    expect(sent.map((call) => call.headers["X-Schematic-Api-Key"])).toEqual([
      "stale",
      "fresh",
    ]);
  });

  it("reads no invoices from a null data array", async () => {
    // Go serializes an empty slice as null.
    const { fetchImpl } = fakeFetch(() => ({ body: { data: null } }));
    const client = new SchematicCompanyClient({
      accessToken: "t",
      fetch: fetchImpl,
    });
    await expect(
      client.fetchInvoices({ limit: 1, offset: 0 }),
    ).resolves.toEqual([]);
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

  it("decodes the upcoming invoice", async () => {
    const { calls, fetchImpl } = fakeFetch(() => ({ body: wireUpcoming }));
    const client = new SchematicCompanyClient({
      accessToken: "t",
      fetch: fetchImpl,
    });
    const invoice = await client.fetchUpcomingInvoice();
    expect(calls[0].url).toBe(
      "https://api.schematichq.com/company/upcoming-invoice",
    );
    expect(invoice?.amountDue).toBe(6800);
    expect(invoice?.dueDate).toBeInstanceOf(Date);
  });

  it.each([204, 404])(
    "reads %i on the upcoming invoice as no next bill",
    async (status) => {
      // A company with no subscription, or an account not on the flag: a
      // state the element renders, not a failure it reports.
      const { fetchImpl } = fakeFetch(() => ({ status, body: null }));
      const client = new SchematicCompanyClient({
        accessToken: "t",
        fetch: fetchImpl,
      });
      await expect(client.fetchUpcomingInvoice()).resolves.toBeNull();
    },
  );

  it("still reports a failed upcoming invoice", async () => {
    const { fetchImpl } = fakeFetch(() => ({ status: 500, body: "oops" }));
    const client = new SchematicCompanyClient({
      accessToken: "t",
      fetch: fetchImpl,
    });
    await expect(client.fetchUpcomingInvoice()).rejects.toBeInstanceOf(
      SchematicApiError,
    );
  });

  it("refreshes a stale token before reading it as no next bill", async () => {
    // 401 is never a nullOn status: the retry has to run first, or an
    // expired token would look like a company with nothing to bill.
    const tokens = ["stale", "fresh"];
    let served = 0;
    const { calls, fetchImpl } = fakeFetch((_url, headers) => {
      served += 1;
      return headers["X-Schematic-Api-Key"] === "fresh"
        ? { body: wireUpcoming }
        : { status: 401, body: { error: "expired" } };
    });
    const client = new SchematicCompanyClient({
      accessToken: () => Promise.resolve(tokens.shift() ?? "fresh"),
      fetch: fetchImpl,
    });
    const invoice = await client.fetchUpcomingInvoice();
    expect(served).toBe(2);
    expect(calls[1].headers["X-Schematic-Api-Key"]).toBe("fresh");
    expect(invoice?.amountDue).toBe(6800);
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
  it("prefetches every resource and skips failures", async () => {
    const { fetchImpl } = fakeFetch((url) =>
      url.includes("upcoming-invoice")
        ? { body: wireUpcoming }
        : {
            body: {
              data: Array.from({ length: 13 }, (_, i) => ({ id: `i${i}` })),
            },
          },
    );
    const client = new SchematicCompanyClient({
      accessToken: "t",
      fetch: fetchImpl,
    });
    const data = await fetchCompanyData(client);
    expect(data.invoices).toMatchObject({ hasMore: true });
    expect(data.invoices?.invoices).toHaveLength(12);
    expect(data.upcomingInvoice).toMatchObject({ amountDue: 6800 });

    const { fetchImpl: failing } = fakeFetch(() => ({
      status: 500,
      body: "x",
    }));
    const empty = await fetchCompanyData(
      new SchematicCompanyClient({ accessToken: "t", fetch: failing }),
    );
    expect(empty.invoices).toBeUndefined();
    expect(empty.upcomingInvoice).toBeUndefined();
  });

  it("seeds a company with no next bill as loaded, not missing", async () => {
    // `null` is the answer, so the key is present: a provider seeded with
    // it renders the empty state instead of a permanent skeleton.
    const { fetchImpl } = fakeFetch((url) =>
      url.includes("upcoming-invoice")
        ? { status: 404, body: null }
        : { body: { data: [] } },
    );
    const data = await fetchCompanyData(
      new SchematicCompanyClient({ accessToken: "t", fetch: fetchImpl }),
    );
    expect(data.upcomingInvoice).toBeNull();
    expect("upcomingInvoice" in data).toBe(true);
  });
});
