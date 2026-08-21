import { describe, expect, it, vi } from "vitest";

import { fetchCatalog, fetchInvoices, SchematicCustomerClient } from "./client";

type FetchCall = { url: string; headers: Record<string, string> };

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const envelope = (data: unknown) => ({ data, params: {} });

/** Minimal catalog payload satisfying the generated required-array fields. */
const catalogBody = (extra: Record<string, unknown> = {}) => ({
  plans: [],
  add_ons: [],
  credit_bundles: [],
  ...extra,
});

/** Minimal company payload satisfying the generated required-array fields. */
const companyBody = (extra: Record<string, unknown> = {}) => ({
  add_ons: [],
  billing_subscriptions: [],
  custom_plan_billings: [],
  entitlements: [],
  entity_traits: [],
  keys: [],
  metrics: [],
  payment_methods: [],
  plans: [],
  rules: [],
  ...extra,
});

const captureFetch = (
  responder: (call: FetchCall, index: number) => Response,
) => {
  const calls: FetchCall[] = [];
  const fetchApi = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const call = {
        url: String(input),
        headers: { ...(init?.headers as Record<string, string>) },
      };
      calls.push(call);
      return responder(call, calls.length - 1);
    },
  );
  return { calls, fetchApi: fetchApi as unknown as typeof fetch };
};

describe("SchematicCustomerClient", () => {
  it("requires a credential", () => {
    expect(() => new SchematicCustomerClient({})).toThrow(/publishableKey/);
  });

  it("fetches the anonymous catalog with the publishable key", async () => {
    const { calls, fetchApi } = captureFetch(() =>
      jsonResponse(envelope(catalogBody({ id: "ctlg_1", name: "Default" }))),
    );
    const client = new SchematicCustomerClient({
      publishableKey: "api_pub",
      fetchApi,
    });

    const catalog = client.catalog();
    await catalog.ensure();

    expect(calls[0].url).toContain("/public/catalog");
    expect(calls[0].headers["X-Schematic-Api-Key"]).toBe("api_pub");
    const snapshot = catalog.getSnapshot();
    expect(snapshot.error).toBeUndefined();
    expect(snapshot.data?.mode).toBe("public");
    expect(snapshot.data?.name).toBe("Default");
  });

  it("fetches the company catalog view by ID when a token is configured", async () => {
    const { calls, fetchApi } = captureFetch(() =>
      jsonResponse(envelope(catalogBody({ id: "ctlg_2", name: "Custom" }))),
    );
    const client = new SchematicCustomerClient({
      accessToken: "token_abc",
      catalogId: "ctlg_2",
      fetchApi,
    });

    await client.catalog().ensure();

    expect(calls[0].url).toContain("/catalogs/ctlg_2/view");
    expect(calls[0].headers["X-Schematic-Api-Key"]).toBe("token_abc");
    expect(client.catalog().getSnapshot().data?.mode).toBe("company");
  });

  it("company-scoped resources refuse to run with only a publishable key", () => {
    const { fetchApi } = captureFetch(() => jsonResponse(envelope({})));
    const client = new SchematicCustomerClient({
      publishableKey: "api_pub",
      fetchApi,
    });
    expect(() => client.company()).toThrow(/accessToken/);
  });

  it("retries exactly once with a fresh token on 401", async () => {
    let issued = 0;
    const provider = vi
      .fn()
      .mockImplementation(async () => `token_${++issued}`);
    const { calls, fetchApi } = captureFetch((call, index) =>
      index === 0
        ? jsonResponse({ error: "unauthorized" }, 401)
        : jsonResponse(envelope(companyBody({ name: "Acme" }))),
    );
    const client = new SchematicCustomerClient({
      accessToken: provider,
      fetchApi,
    });

    const company = client.company();
    await company.ensure();

    expect(calls).toHaveLength(2);
    expect(calls[0].headers["X-Schematic-Api-Key"]).toBe("token_1");
    expect(calls[1].headers["X-Schematic-Api-Key"]).toBe("token_2");
    expect(company.getSnapshot().error).toBeUndefined();
    expect(company.getSnapshot().data?.name).toBe("Acme");
  });

  it("setAccessToken resets every resource on a real credential change", async () => {
    const { fetchApi } = captureFetch(() =>
      jsonResponse(envelope(companyBody(catalogBody({ name: "Acme" })))),
    );
    const client = new SchematicCustomerClient({
      accessToken: "token_1",
      fetchApi,
    });

    const catalog = client.catalog();
    const company = client.company();
    await Promise.all([catalog.ensure(), company.ensure()]);
    expect(catalog.getSnapshot().data).toBeDefined();
    expect(company.getSnapshot().data).toBeDefined();

    client.setAccessToken("token_2");
    // A different token may be a different company: the company resources
    // AND the company-decorated catalog both reset.
    expect(company.getSnapshot().data).toBeUndefined();
    expect(catalog.getSnapshot().data).toBeUndefined();
  });

  it("treats a new provider function as the same session", async () => {
    let calls = 0;
    const { fetchApi } = captureFetch(() =>
      jsonResponse(envelope(companyBody({ name: "Acme" }))),
    );
    const client = new SchematicCustomerClient({
      accessToken: async () => `token_${++calls}`,
      fetchApi,
    });

    const company = client.company();
    await company.ensure();
    expect(company.getSnapshot().data).toBeDefined();
    expect(calls).toBe(1);

    // A fresh function identity (e.g. an inline React prop) neither drops
    // the cached token nor resets resources.
    client.setAccessToken(async () => `token_${++calls}`);
    expect(company.getSnapshot().data).toBeDefined();
    await company.refetch();
    expect(calls).toBe(1);

    // resetSession is the explicit "same provider, different company"
    // signal: cached token dropped, resources reset.
    client.resetSession();
    expect(company.getSnapshot().data).toBeUndefined();
    await company.ensure();
    expect(calls).toBe(2);
  });

  it("reset refetches immediately for subscribed resources", async () => {
    const { calls, fetchApi } = captureFetch(() =>
      jsonResponse(envelope(companyBody(catalogBody({ name: "Acme" })))),
    );
    const client = new SchematicCustomerClient({
      accessToken: "token_1",
      fetchApi,
    });

    const catalog = client.catalog();
    const unsubscribe = catalog.subscribe(() => {});
    await catalog.ensure();
    const before = calls.length;

    client.setAccessToken("token_2");
    // The subscribed catalog kicked off a fresh fetch on reset; wait for
    // it to settle rather than sitting on a permanent spinner.
    await vi.waitFor(() => {
      expect(catalog.getSnapshot().data).toBeDefined();
    });
    expect(calls.length).toBe(before + 1);
    expect(calls[calls.length - 1].headers["X-Schematic-Api-Key"]).toBe(
      "token_2",
    );
    unsubscribe();
  });
});

describe("SchematicCustomerClient review regressions", () => {
  it("does not loop on persistent 401s even with a fresh token per call", async () => {
    let issued = 0;
    const provider = vi
      .fn()
      .mockImplementation(async () => `token_${++issued}`);
    const { calls, fetchApi } = captureFetch(() =>
      jsonResponse({ error: "unauthorized" }, 401),
    );
    const client = new SchematicCustomerClient({
      accessToken: provider,
      fetchApi,
    });

    const company = client.company();
    await company.ensure();

    // One original attempt plus exactly one raw retry.
    expect(calls).toHaveLength(2);
    expect(company.getSnapshot().error).toBeDefined();
  });

  it("uses the new credential after a mode round-trip on cached resources", async () => {
    const { calls, fetchApi } = captureFetch(() =>
      jsonResponse(envelope(companyBody({ name: "Acme" }))),
    );
    const client = new SchematicCustomerClient({
      accessToken: "token_companyA",
      publishableKey: "api_pub",
      fetchApi,
    });

    const company = client.company();
    await company.ensure();
    expect(calls[0].headers["X-Schematic-Api-Key"]).toBe("token_companyA");

    // Drop to key-only, then authenticate as a different company. The
    // cached resource must authenticate with the new token, not the one
    // captured at creation.
    client.setAccessToken(undefined);
    client.setAccessToken("token_companyB");
    await company.ensure();
    expect(calls[1].headers["X-Schematic-Api-Key"]).toBe("token_companyB");
  });

  it("invalidateAll skips refetching unwatched resources", async () => {
    const { calls, fetchApi } = captureFetch(() =>
      jsonResponse(envelope(companyBody({ name: "Acme" }))),
    );
    const client = new SchematicCustomerClient({
      accessToken: "token_1",
      fetchApi,
    });

    const watched = client.company();
    const unsubscribe = watched.subscribe(() => {});
    const unwatched = client.invoices({ limit: 5 });
    await Promise.all([watched.ensure(), unwatched.ensure()]);
    const before = calls.length;

    client.invalidateAll();
    await Promise.resolve();
    await watched.ensure();
    await Promise.resolve();

    // Only the subscribed resource refetched; the unwatched invoice page
    // waits for its next ensure().
    expect(calls.length).toBe(before + 1);
    unsubscribe();
  });
});

describe("SchematicCustomerClient branch-audit regressions", () => {
  it("names the missing publishable key when public mode is forced", () => {
    const { fetchApi } = captureFetch(() => jsonResponse(envelope({})));
    const client = new SchematicCustomerClient({
      accessToken: "token_1",
      fetchApi,
    });
    expect(() => client.catalog({ mode: "public" })).toThrow(
      /mode "public" requires a publishableKey/,
    );
  });

  it("pages invoices with an extra row to detect more, and appends pages", async () => {
    const rows = Array.from({ length: 25 }, (_, i) => ({
      amount_due: 100 * (i + 1),
      created_at: "2026-01-01T00:00:00Z",
      currency: "usd",
      id: `inv_${i}`,
    }));
    const { calls, fetchApi } = captureFetch((call) => {
      const limit = Number(new URL(call.url).searchParams.get("limit"));
      return jsonResponse(envelope(rows.slice(0, limit)));
    });
    const client = new SchematicCustomerClient({
      accessToken: "token_1",
      fetchApi,
    });

    const invoices = client.invoices();
    await invoices.ensure();
    expect(new URL(calls[0].url).searchParams.get("limit")).toBe("11");
    expect(invoices.getSnapshot().data?.rows).toHaveLength(10);
    expect(invoices.getSnapshot().data?.hasMore).toBe(true);

    await client.fetchMoreInvoices();
    expect(new URL(calls[1].url).searchParams.get("limit")).toBe("21");
    expect(new URL(calls[1].url).searchParams.get("offset")).toBe("0");
    expect(invoices.getSnapshot().data?.rows).toHaveLength(20);
    expect(invoices.getSnapshot().data?.hasMore).toBe(true);

    await client.fetchMoreInvoices();
    expect(invoices.getSnapshot().data?.rows).toHaveLength(25);
    expect(invoices.getSnapshot().data?.hasMore).toBe(false);
  });

  it("treats explicit default invoice params as the default resource", () => {
    const { fetchApi } = captureFetch(() => jsonResponse(envelope([])));
    const client = new SchematicCustomerClient({
      accessToken: "token_1",
      fetchApi,
    });
    expect(client.invoices({})).toBe(client.invoices());
    expect(client.invoices({ limit: 10 })).toBe(client.invoices());
    expect(client.invoices({ limit: 5 })).not.toBe(client.invoices());
  });

  it("seeds only the default resources with initialData", async () => {
    const { calls, fetchApi } = captureFetch(() =>
      jsonResponse(envelope(catalogBody({ id: "ctlg_live", name: "Live" }))),
    );
    const seededCatalog = {
      mode: "public" as const,
      addOns: [],
      capabilities: { badgeVisibility: false, checkout: false },
      creditBundles: [],
      defaultCurrency: "usd",
      id: "ctlg_seed",
      name: "Seeded",
      plans: [],
    };
    const client = new SchematicCustomerClient({
      publishableKey: "api_pub",
      fetchApi,
      initialData: {
        catalog: seededCatalog,
        invoices: { hasMore: false, rows: [] },
      },
    });

    // The default catalog starts settled from the seed: no request.
    const seeded = client.catalog();
    expect(seeded.getSnapshot().isPending).toBe(false);
    expect(seeded.getSnapshot().data?.name).toBe("Seeded");
    await seeded.ensure();
    expect(calls).toHaveLength(0);

    // A different catalog is not the seeded one.
    const other = client.catalog({ catalogId: "ctlg_other" });
    expect(other.getSnapshot().isPending).toBe(true);
    await other.ensure();
    expect(calls).toHaveLength(1);
  });

  it("does not seed a catalog of the wrong shape", async () => {
    const { calls, fetchApi } = captureFetch(() =>
      jsonResponse(envelope(catalogBody({ id: "ctlg_live", name: "Live" }))),
    );
    // A public catalog prefetched on the server, handed to a client that
    // holds a token: the company view is a different shape, so it fetches.
    const client = new SchematicCustomerClient({
      accessToken: "token_1",
      fetchApi,
      initialData: {
        catalog: {
          mode: "public",
          addOns: [],
          capabilities: { badgeVisibility: false, checkout: false },
          creditBundles: [],
          defaultCurrency: "usd",
          id: "ctlg_seed",
          name: "Seeded",
          plans: [],
        },
      },
    });
    const catalog = client.catalog();
    expect(catalog.getSnapshot().isPending).toBe(true);
    await catalog.ensure();
    expect(calls).toHaveLength(1);
    expect(catalog.getSnapshot().data?.mode).toBe("company");
  });

  it("keeps the invoice page count when loading more fails", async () => {
    const rows = Array.from({ length: 30 }, (_, i) => ({
      amount_due: 100,
      created_at: "2026-01-01T00:00:00Z",
      currency: "usd",
      id: `inv_${i}`,
    }));
    const { calls, fetchApi } = captureFetch((call, index) => {
      if (index === 1) {
        return jsonResponse({ error: "boom" }, 500);
      }
      const limit = Number(new URL(call.url).searchParams.get("limit"));
      return jsonResponse(envelope(rows.slice(0, limit)));
    });
    const client = new SchematicCustomerClient({
      accessToken: "token_1",
      fetchApi,
    });
    const invoices = client.invoices();
    await invoices.ensure();
    await client.fetchMoreInvoices();
    expect(invoices.getSnapshot().error).toBeDefined();
    // The retry asks for page two again, not page three.
    await client.fetchMoreInvoices();
    expect(new URL(calls[2].url).searchParams.get("limit")).toBe("21");
    expect(invoices.getSnapshot().data?.rows).toHaveLength(20);
  });

  it("drops initialData on a session change", () => {
    const { fetchApi } = captureFetch(() =>
      jsonResponse(envelope(companyBody({ name: "Live" }))),
    );
    const client = new SchematicCustomerClient({
      accessToken: "token_a",
      fetchApi,
      initialData: {
        company: {
          addOns: [],
          id: "comp_seed",
          name: "Seeded",
        } as never,
      },
    });
    client.setAccessToken("token_b");
    // A company resource first created after the change must not start
    // from the previous session's seed.
    expect(client.company().getSnapshot().data).toBeUndefined();
    expect(client.company().getSnapshot().isPending).toBe(true);
  });

  it("load() resolves data and rejects with the normalized API error", async () => {
    const { fetchApi } = captureFetch((_call, index) =>
      index === 0
        ? jsonResponse(envelope(catalogBody({ id: "ctlg_1", name: "Default" })))
        : jsonResponse({ error: "Catalog not found" }, 404),
    );
    const client = new SchematicCustomerClient({
      publishableKey: "api_pub",
      fetchApi,
    });
    const catalog = await client.catalog().load();
    expect(catalog.name).toBe("Default");

    await expect(
      client.catalog({ catalogId: "ctlg_x" }).load(),
    ).rejects.toMatchObject({
      name: "SchematicApiError",
      status: 404,
    });
  });

  it("retries a failed fetch on the next ensure instead of caching the error", async () => {
    const { calls, fetchApi } = captureFetch((_call, index) =>
      index === 0
        ? jsonResponse({ error: "boom" }, 500)
        : jsonResponse(
            envelope(catalogBody({ id: "ctlg_1", name: "Default" })),
          ),
    );
    const client = new SchematicCustomerClient({
      publishableKey: "api_pub",
      fetchApi,
    });
    const catalog = client.catalog();
    await catalog.ensure();
    expect(catalog.getSnapshot().error).toBeDefined();

    await catalog.ensure();
    expect(calls).toHaveLength(2);
    expect(catalog.getSnapshot().error).toBeUndefined();
    expect(catalog.getSnapshot().data?.name).toBe("Default");
  });

  it("one-shot fetchers resolve plain data with the given parameters", async () => {
    const { calls, fetchApi } = captureFetch((call) =>
      call.url.includes("/company/invoices")
        ? jsonResponse(envelope([]))
        : jsonResponse(envelope(catalogBody({ id: "ctlg_9", name: "Nine" }))),
    );
    const catalog = await fetchCatalog({
      catalogId: "ctlg_9",
      fetchApi,
      publishableKey: "api_pub",
    });
    expect(catalog.mode).toBe("public");
    expect(catalog.name).toBe("Nine");
    expect(calls[0].url).toContain("/public/catalogs/ctlg_9");

    const page = await fetchInvoices({
      accessToken: "token_1",
      fetchApi,
      includePending: true,
      limit: 3,
    });
    expect(page).toEqual({ hasMore: false, rows: [] });
    const url = new URL(calls[1].url);
    expect(url.searchParams.get("include_pending")).toBe("true");
    expect(url.searchParams.get("limit")).toBe("4");
  });
});
