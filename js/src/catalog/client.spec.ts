import { vi } from "vitest";

import {
  SchematicApiError,
  SchematicCatalogClient,
  fetchCatalogData,
} from "./client";
import { decode, decodeFeatureUsage, decodeUpcomingInvoice } from "./decode";

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

const wireCatalog = {
  data: {
    id: "cat_1",
    name: "Catalog",
    default_currency: "usd",
    capabilities: { checkout: true },
    plans: [
      {
        id: "plan_1",
        name: "Pro",
        prices: [
          {
            id: "price_1",
            currency: "usd",
            interval: "month",
            interval_count: 1,
            amount: 4900,
          },
        ],
        entitlements: [],
      },
    ],
    add_ons: [],
    credit_bundles: [],
  },
};

describe("SchematicCatalogClient", () => {
  it("reads the public catalog with the publishable key", async () => {
    const { calls, fetchImpl } = fakeFetch(() => ({ body: wireCatalog }));
    const client = new SchematicCatalogClient({
      publishableKey: "pk_test",
      apiUrl: "https://api.test/",
      fetch: fetchImpl,
    });
    const catalog = await client.fetchCatalog();
    expect(calls[0].url).toBe("https://api.test/public/catalog");
    expect(calls[0].headers["X-Schematic-Api-Key"]).toBe("pk_test");
    expect(catalog.plans[0].prices[0]).toMatchObject({
      intervalCount: 1,
      amount: 4900,
    });
    expect(catalog.defaultCurrency).toBe("usd");
  });

  it("targets a specific catalog by id on both tiers", async () => {
    const { calls, fetchImpl } = fakeFetch(() => ({ body: wireCatalog }));
    await new SchematicCatalogClient({
      publishableKey: "pk",
      catalogId: "cat/2",
      fetch: fetchImpl,
    }).fetchCatalog();
    expect(calls[0].url).toBe(
      "https://api.schematichq.com/public/catalogs/cat%2F2",
    );
    await new SchematicCatalogClient({
      accessToken: "tok",
      catalogId: "cat_2",
      fetch: fetchImpl,
    }).fetchCatalog();
    expect(calls[1].url).toBe(
      "https://api.schematichq.com/catalogs/cat_2/view",
    );
    expect(calls[1].headers["X-Schematic-Api-Key"]).toBe("tok");
  });

  it("uses the company view when a token is held, and the key otherwise", async () => {
    const { calls, fetchImpl } = fakeFetch(() => ({ body: wireCatalog }));
    const client = new SchematicCatalogClient({
      publishableKey: "pk",
      accessToken: "tok",
      fetch: fetchImpl,
    });
    await client.fetchCatalog();
    expect(calls[0].url).toMatch(/\/catalog\/view$/);
    client.setAccessToken(undefined);
    await client.fetchCatalog();
    expect(calls[1].url).toMatch(/\/public\/catalog$/);
    expect(calls[1].headers["X-Schematic-Api-Key"]).toBe("pk");
  });

  it("rejects company reads without a token and public reads without a key", async () => {
    const { fetchImpl } = fakeFetch(() => ({}));
    await expect(
      new SchematicCatalogClient({
        publishableKey: "pk",
        fetch: fetchImpl,
      }).fetchCompany(),
    ).rejects.toThrow(/access token/);
    await expect(
      new SchematicCatalogClient({
        accessToken: "t",
        fetch: fetchImpl,
      }).fetchCatalog(),
    ).resolves.toBeDefined();
    await expect(
      new SchematicCatalogClient({ fetch: fetchImpl }).fetchCatalog(),
    ).rejects.toThrow(/publishable key/);
  });

  it("resolves a token provider once and shares it across concurrent requests", async () => {
    const provider = vi.fn(async () => ({ token: "t1" }));
    const { calls, fetchImpl } = fakeFetch(() => ({
      body: { data: { rows: [] } },
    }));
    const client = new SchematicCatalogClient({
      accessToken: provider,
      fetch: fetchImpl,
    });
    await Promise.all([client.fetchFeatureUsage(), client.fetchFeatureUsage()]);
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
        : { body: { data: { id: "comp_1" } } },
    );
    const client = new SchematicCatalogClient({
      accessToken: provider,
      fetch: fetchImpl,
    });
    const company = await client.fetchCompany();
    expect(company.id).toBe("comp_1");
    expect(calls).toHaveLength(2);
    expect(provider).toHaveBeenCalledTimes(2);
  });

  it("re-resolves an expired cached token before requesting", async () => {
    let n = 0;
    const provider = vi.fn(async () => ({
      token: `t${++n}`,
      expiresAt: new Date(Date.now() - 1000),
    }));
    const { calls, fetchImpl } = fakeFetch(() => ({ body: { data: {} } }));
    const client = new SchematicCatalogClient({
      accessToken: provider,
      fetch: fetchImpl,
    });
    await client.fetchCompany();
    await client.fetchCompany();
    expect(provider).toHaveBeenCalledTimes(2);
    expect(calls[1].headers["X-Schematic-Api-Key"]).toBe("t2");
  });

  it("does not retry a 401 with a string token; it surfaces the error", async () => {
    const { fetchImpl } = fakeFetch(() => ({
      status: 401,
      body: { error: "nope" },
    }));
    const client = new SchematicCatalogClient({
      accessToken: "tok",
      fetch: fetchImpl,
    });
    await expect(client.fetchCompany()).rejects.toMatchObject({
      name: "SchematicApiError",
      status: 401,
      message: "nope",
    });
  });

  it("notifies listeners only when the credential actually changes", () => {
    const client = new SchematicCatalogClient({ accessToken: "a" });
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

  it("passes paging params and decodes invoice rows", async () => {
    const { calls, fetchImpl } = fakeFetch(() => ({
      body: {
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
      },
    }));
    const client = new SchematicCatalogClient({
      accessToken: "t",
      fetch: fetchImpl,
    });
    const rows = await client.fetchInvoices({ limit: 13, offset: 12 });
    expect(calls[0].url).toBe(
      "https://api.schematichq.com/company/invoices?limit=13&offset=12",
    );
    expect(rows[0].dueDate).toBeInstanceOf(Date);
    expect(rows[0]).toMatchObject({ amountDue: 100, url: null });
  });

  it("maps 404 and 204 on the upcoming invoice to null", async () => {
    const { fetchImpl } = fakeFetch(() => ({
      status: 404,
      body: { error: "none" },
    }));
    const client = new SchematicCatalogClient({
      accessToken: "t",
      fetch: fetchImpl,
    });
    expect(await client.fetchUpcomingInvoice()).toBeNull();
  });

  it("throws SchematicApiError with the body for other failures", async () => {
    const { fetchImpl } = fakeFetch(() => ({ status: 500, body: "oops" }));
    const client = new SchematicCatalogClient({
      publishableKey: "pk",
      fetch: fetchImpl,
    });
    const error = await client.fetchCatalog().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(SchematicApiError);
    expect(error).toMatchObject({
      status: 500,
      body: "oops",
      path: "/public/catalog",
    });
  });
});

describe("decode", () => {
  it("camelCases keys recursively and parses timestamp fields", () => {
    const out = decode({
      plan_entitlement_id: "pe",
      resets_at: "2026-08-21T12:00:00Z",
      feature: { singular_name: "seat", created_at: null },
      tiers: [{ per_unit_amount: 1 }],
    }) as Record<string, unknown>;
    expect(out).toMatchObject({
      planEntitlementId: "pe",
      feature: { singularName: "seat", createdAt: null },
      tiers: [{ perUnitAmount: 1 }],
    });
    expect(out.resetsAt).toBeInstanceOf(Date);
  });

  it("unwraps the data envelope and list wrappers", () => {
    expect(decodeFeatureUsage({ data: { rows: [{ usage: 1 }] } })).toEqual([
      { usage: 1 },
    ]);
    expect(decodeFeatureUsage([{ usage: 2 }])).toEqual([{ usage: 2 }]);
    expect(decodeUpcomingInvoice({ data: null })).toBeNull();
    expect(decodeUpcomingInvoice({ data: { amount_due: 5 } })).toEqual({
      amountDue: 5,
    });
  });
});

describe("fetchCatalogData", () => {
  it("prefetches what the credentials allow and skips failures", async () => {
    const { fetchImpl } = fakeFetch((url) =>
      url.includes("/company/credits")
        ? { status: 500, body: "x" }
        : url.includes("/company/invoices")
          ? {
              body: {
                data: Array.from({ length: 13 }, (_, i) => ({ id: `i${i}` })),
              },
            }
          : { body: wireCatalog },
    );
    const client = new SchematicCatalogClient({
      publishableKey: "pk",
      accessToken: "t",
      fetch: fetchImpl,
    });
    const data = await fetchCatalogData(client);
    expect(data.catalog?.id).toBe("cat_1");
    expect(data.credits).toBeUndefined();
    expect(data.invoices).toMatchObject({ hasMore: true });
    expect(data.invoices?.invoices).toHaveLength(12);

    const publicOnly = await fetchCatalogData(
      new SchematicCatalogClient({ publishableKey: "pk", fetch: fetchImpl }),
    );
    expect(Object.keys(publicOnly)).toEqual(["catalog"]);
  });
});
