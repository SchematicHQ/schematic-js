import { SchematicBillingClient, fetchBillingData } from "./client";
import { fakeFetch, tokens } from "./testing";
import { SchematicApiError, SchematicSession } from "./session";

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

describe("SchematicBillingClient", () => {
  it("passes paging params and decodes invoice rows", async () => {
    const { calls, fetchImpl } = fakeFetch(() => ({ body: wireInvoices }));
    const client = new SchematicBillingClient({
      session: { company: "comp_a", token: "t" },
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
    const client = new SchematicBillingClient({
      session: { company: "comp_a", token: "t" },
      fetch: fetchImpl,
    });
    await client.fetchInvoices({ limit: 1, offset: 0, includePending: true });
    expect(calls[0].url).toBe(
      "https://api.schematichq.com/company/invoices?limit=1&offset=0&include_pending=true",
    );
  });

  it("reads no invoices from a null page or a null row array", async () => {
    // The API sends `[]` for an empty history, but a null from anywhere in
    // the chain reads as no invoices rather than throwing in the decoder.
    for (const body of [
      { data: null },
      { data: { count: 0, invoices: null } },
    ]) {
      const { fetchImpl } = fakeFetch(() => ({ body }));
      const client = new SchematicBillingClient({
        session: { company: "comp_a", token: "t" },
        fetch: fetchImpl,
      });
      await expect(
        client.fetchInvoices({ limit: 1, offset: 0 }),
      ).resolves.toEqual({ invoices: [], count: 0 });
    }
  });

  it("never asks for a page larger than the API serves", async () => {
    const { calls, fetchImpl } = fakeFetch(() => ({ body: wireEmpty }));
    const client = new SchematicBillingClient({
      session: { company: "comp_a", token: "t" },
      fetch: fetchImpl,
    });
    await client.fetchInvoices({ limit: 4000, offset: 0 });
    expect(calls[0].url).toContain("limit=250");
  });

  it("reports a malformed body rather than throwing a TypeError", async () => {
    const { fetchImpl } = fakeFetch(() => ({ body: null }));
    const client = new SchematicBillingClient({
      session: { company: "comp_a", token: "t" },
      fetch: fetchImpl,
    });
    await expect(client.fetchInvoices({ limit: 1, offset: 0 })).rejects.toThrow(
      /Malformed response/,
    );
  });

  it("throws SchematicApiError with the body for other failures", async () => {
    const { fetchImpl } = fakeFetch(() => ({ status: 500, body: "oops" }));
    const client = new SchematicBillingClient({
      session: { company: "comp_a", token: "t" },
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

  it("reports the session it reads, and states one through to it", () => {
    const client = new SchematicBillingClient();
    const events: string[] = [];
    client.onSessionChange((event) => events.push(event.type));

    expect(client.sessionStatus).toBe("pending");
    expect(client.sessionKey).toBeUndefined();
    client.setSession({ company: "comp_a", token: "t" });
    expect(client.sessionStatus).toBe("active");
    expect(client.sessionKey).toBe(client.session.key);
    expect(events).toEqual(["started"]);
  });

  it("can be built over a session another client already holds", async () => {
    // The point of the split: a second surface over the same credential
    // mints nothing of its own, and one `setSession` moves both.
    let minted = 0;
    const { calls, fetchImpl } = fakeFetch(() => ({ body: wireEmpty }));
    const session = new SchematicSession({
      session: { company: "comp_a", token: async () => `t${++minted}` },
      fetch: fetchImpl,
    });
    const first = new SchematicBillingClient(session);
    const second = new SchematicBillingClient(session);

    await first.fetchInvoices({ limit: 1, offset: 0 });
    await second.fetchInvoices({ limit: 1, offset: 0 });

    expect(minted).toBe(1);
    expect(tokens(calls)).toEqual(["t1", "t1"]);

    first.setSession({ company: "comp_b", token: "t_b" });
    expect(second.sessionStatus).toBe("active");
    expect(second.sessionKey).toBe(first.sessionKey);
  });
});

describe("fetchBillingData", () => {
  it("prefetches the query it is asked for, and says which it was", async () => {
    // Seeded under the defaults, a prefetch for another query is read by
    // nobody: the element asking that query fetches the same page again.
    const { calls, fetchImpl } = fakeFetch(() => ({ body: wireEmpty }));
    const client = new SchematicBillingClient({
      session: { company: "comp_a", token: "t" },
      fetch: fetchImpl,
    });
    const data = await fetchBillingData(client, {
      invoices: { includePending: true },
    });
    expect(calls[0].url).toContain("include_pending=true");
    expect(data.params).toEqual({ invoices: { includePending: true } });
    expect(data.sessionKey).toBe(client.sessionKey);
  });

  it("seeds the query under the key an element asks it by", async () => {
    // `{ includePending: false }` and `{}` are the same query, and the store
    // keys the second. Seeded verbatim, the rows are read by nobody and the
    // element fetches the page again.
    const { calls, fetchImpl } = fakeFetch(() => ({ body: wireEmpty }));
    const client = new SchematicBillingClient({
      session: { company: "comp_a", token: "t" },
      fetch: fetchImpl,
    });
    const data = await fetchBillingData(client, {
      invoices: { includePending: false },
    });
    expect(data.params).toEqual({ invoices: {} });
    expect(calls[0].url).not.toContain("include_pending");
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
    const client = new SchematicBillingClient({
      session: { company: "comp_a", token: "t" },
      fetch: fetchImpl,
    });
    const data = await fetchBillingData(client);
    expect(data.invoices).toMatchObject({ count: 84, hasMore: true });
    expect(data.invoices?.invoices).toHaveLength(12);

    const { fetchImpl: failing } = fakeFetch(() => ({
      status: 500,
      body: "x",
    }));
    const empty = await fetchBillingData(
      new SchematicBillingClient({
        session: { company: "comp_a", token: "t" },
        fetch: failing,
      }),
    );
    expect(empty.invoices).toBeUndefined();
  });
});
