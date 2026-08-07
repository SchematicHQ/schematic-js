import { describe, expect, it, vi } from "vitest";

import {
  envelope,
  jsonResponse,
  makeWireHydrate,
  makeWireInvoice,
  makeWirePublicPlans,
} from "./__tests__/fixtures";
import { SchematicCustomerClient } from "./customerClient";

type FetchCall = { url: string; init: RequestInit | undefined };

function makeFetch(
  handler: (url: string, init?: RequestInit) => Response | Promise<Response>,
) {
  const calls: FetchCall[] = [];
  const fetchFn = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, init });
      return handler(url, init);
    },
  ) as unknown as typeof fetch;
  return { fetchFn, calls };
}

function makeClient(
  handler: (url: string, init?: RequestInit) => Response | Promise<Response>,
  options?: { publishableKey?: string; getAccessToken?: () => Promise<string> },
) {
  const { fetchFn, calls } = makeFetch(handler);
  const client = new SchematicCustomerClient({
    publishableKey:
      options && "publishableKey" in options
        ? options.publishableKey
        : "api_pub",
    getAccessToken:
      options && "getAccessToken" in options
        ? options.getAccessToken
        : async () => "token_fresh",
    fetchFn,
  });
  return { client, calls };
}

describe("SchematicCustomerClient", () => {
  it("throws when neither auth mode is configured", () => {
    expect(() => new SchematicCustomerClient({})).toThrow(
      /publishableKey|getAccessToken/,
    );
  });

  it("fetches hydrate once for any number of consumers", async () => {
    const { client, calls } = makeClient(() =>
      jsonResponse(envelope(makeWireHydrate())),
    );

    const resource = client.hydrate;
    expect(client.hydrate).toBe(resource); // stable identity

    resource.ensure();
    resource.ensure();
    await resource.refetch();

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toContain("/components/hydrate");
    const data = resource.getSnapshot().data!;
    expect(data.activePlans[0].id).toBe("plan_basic");
    expect(data.activePlans[0].current).toBe(true);
  });

  it("sends the access token and client version headers", async () => {
    const { client, calls } = makeClient(() =>
      jsonResponse(envelope(makeWireHydrate())),
    );

    await client.hydrate.refetch();

    const headers = calls[0].init?.headers as Record<string, string>;
    expect(headers["X-Schematic-Api-Key"]).toBe("token_fresh");
    expect(headers["X-Schematic-Client-Version"]).toMatch(/^schematic-js@/);
  });

  it("retries exactly once with a fresh token on 401", async () => {
    let tokenCount = 0;
    const seenTokens: string[] = [];
    const { fetchFn, calls } = makeFetch((url, init) => {
      const headers = init?.headers as Record<string, string>;
      seenTokens.push(headers["X-Schematic-Api-Key"]);
      // First token is always rejected; the refreshed one succeeds.
      if (headers["X-Schematic-Api-Key"] === "token_0") {
        return jsonResponse({ error: "unauthorized" }, 401);
      }
      return jsonResponse(envelope(makeWireHydrate()));
    });
    const client = new SchematicCustomerClient({
      getAccessToken: async () => `token_${tokenCount++}`,
      fetchFn,
    });

    await client.hydrate.refetch();

    expect(seenTokens).toEqual(["token_0", "token_1"]);
    expect(calls).toHaveLength(2);
    expect(client.hydrate.getSnapshot().data).toBeDefined();
    expect(client.hydrate.getSnapshot().error).toBeUndefined();
  });

  it("surfaces an error when the retried request is still 401", async () => {
    const { client, calls } = makeClient(() =>
      jsonResponse({ error: "unauthorized" }, 401),
    );

    await client.hydrate.refetch();

    const state = client.hydrate.getSnapshot();
    expect(state.error).toBeDefined();
    expect(state.data).toBeUndefined();
    expect(calls).toHaveLength(2); // original + exactly one replay
  });

  it("fetches the public catalog with the publishable key", async () => {
    const { client, calls } = makeClient(
      () => jsonResponse(envelope(makeWirePublicPlans())),
      {
        publishableKey: "api_pub",
        getAccessToken: undefined,
      },
    );

    await client.publicPlans.refetch();

    expect(calls[0].url).toContain("/public/plans");
    const headers = calls[0].init?.headers as Record<string, string>;
    expect(headers["X-Schematic-Api-Key"]).toBe("api_pub");
    expect(client.publicPlans.getSnapshot().data?.activePlans[0].id).toBe(
      "plan_basic",
    );
  });

  it("returns a stable invoices resource per params combination", async () => {
    const { client, calls } = makeClient(() =>
      jsonResponse(
        envelope([makeWireInvoice(), makeWireInvoice({ id: "inv_2" })]),
      ),
    );

    const a = client.invoices({ limit: 2 });
    const b = client.invoices({ limit: 2 });
    const c = client.invoices({ limit: 5 });
    expect(a).toBe(b);
    expect(a).not.toBe(c);

    await a.refetch();
    expect(calls[0].url).toContain("/components/invoices");
    expect(calls[0].url).toContain("limit=2");
    expect(a.getSnapshot().data).toHaveLength(2);
  });

  it("invalidate() marks hydrate and invoice resources stale", async () => {
    const { client, calls } = makeClient((url) =>
      url.includes("/components/invoices")
        ? jsonResponse(envelope([makeWireInvoice()]))
        : jsonResponse(envelope(makeWireHydrate())),
    );

    await client.hydrate.refetch();
    await client.invoices().refetch();
    expect(calls).toHaveLength(2);

    client.invalidate();
    client.hydrate.ensure();
    client.invoices().ensure();
    await Promise.all([client.hydrate.refetch(), client.invoices().refetch()]);

    expect(calls).toHaveLength(4);
  });

  it("guards company-scoped access on a public-only client", () => {
    const { client } = makeClient(
      () => jsonResponse(envelope(makeWirePublicPlans())),
      {
        publishableKey: "api_pub",
        getAccessToken: undefined,
      },
    );

    expect(() => client.hydrate).toThrow(/getAccessToken/);
    expect(() => client.invoices()).toThrow(/getAccessToken/);
    expect(client.hasAccessTokenMode).toBe(false);
    expect(client.hasPublishableMode).toBe(true);
  });

  it("guards the public catalog on a token-only client", () => {
    const { client } = makeClient(
      () => jsonResponse(envelope(makeWireHydrate())),
      {
        publishableKey: undefined,
        getAccessToken: async () => "token_x",
      },
    );

    expect(() => client.publicPlans).toThrow(/publishableKey/);
    expect(client.hasAccessTokenMode).toBe(true);
    expect(client.hasPublishableMode).toBe(false);
  });

  it("rejects raw checkout calls with a setup error on a public-only client", async () => {
    const { client, calls } = makeClient(
      () => jsonResponse(envelope(makeWirePublicPlans())),
      { publishableKey: "api_pub", getAccessToken: undefined },
    );

    await expect(client.api.checkout.hydrateRaw({})).rejects.toThrow(
      /getAccessToken/,
    );
    expect(calls).toHaveLength(0);
  });

  describe("resource() registry", () => {
    it("memoizes per key; the first registration's fetcher wins", async () => {
      const { client } = makeClient(() =>
        jsonResponse(envelope(makeWireHydrate())),
      );

      const first = vi.fn(async () => "first");
      const second = vi.fn(async () => "second");
      const a = client.resource("balance", first);
      const b = client.resource("balance", second);
      expect(a).toBe(b);

      await a.refetch();
      expect(first).toHaveBeenCalledTimes(1);
      expect(second).not.toHaveBeenCalled();
      expect(a.getSnapshot().data).toBe("first");
    });

    it("invalidateResources() matches by prefix, or everything with no argument", async () => {
      const { client } = makeClient(() =>
        jsonResponse(envelope(makeWireHydrate())),
      );

      const balanceFetcher = vi.fn(async () => "balance");
      const upcomingFetcher = vi.fn(async () => "upcoming");
      const balance = client.resource("checkout.balance", balanceFetcher);
      const upcoming = client.resource("other.upcoming", upcomingFetcher);
      await balance.refetch();
      await upcoming.refetch();

      client.invalidateResources("checkout.");
      balance.ensure();
      upcoming.ensure();
      expect(balanceFetcher).toHaveBeenCalledTimes(2);
      expect(upcomingFetcher).toHaveBeenCalledTimes(1);
      await balance.refetch();

      client.invalidateResources();
      balance.ensure();
      upcoming.ensure();
      expect(balanceFetcher).toHaveBeenCalledTimes(3);
      expect(upcomingFetcher).toHaveBeenCalledTimes(2);
    });
  });

  it("rejects an empty-string access token", () => {
    expect(
      () =>
        new SchematicCustomerClient({
          publishableKey: "api_pub",
          getAccessToken: "",
        }),
    ).toThrow(/empty string/);

    const { client } = makeClient(() =>
      jsonResponse(envelope(makeWireHydrate())),
    );
    expect(() => client.setAccessToken("")).toThrow(/empty string/);
  });

  describe("setAccessToken()", () => {
    it("resets company-scoped data and authenticates with the new token", async () => {
      const { client, calls } = makeClient(() =>
        jsonResponse(envelope(makeWireHydrate())),
      );

      await client.hydrate.refetch();
      expect(client.hydrate.getSnapshot().data).toBeDefined();

      client.setAccessToken(async () => "token_company_b");
      // Old company's data must not survive the swap; the provider has to be
      // resolved before the new token is known, so the drop lands async
      await vi.waitFor(() =>
        expect(client.hydrate.getSnapshot().data).toBeUndefined(),
      );

      await client.hydrate.refetch();
      const headers = calls[calls.length - 1].init?.headers as Record<
        string,
        string
      >;
      expect(headers["X-Schematic-Api-Key"]).toBe("token_company_b");
    });

    it("keeps cached data when a new provider yields the same token", async () => {
      const { client, calls } = makeClient(() =>
        jsonResponse(envelope(makeWireHydrate())),
      );

      await client.hydrate.refetch();
      const data = client.hydrate.getSnapshot().data;
      expect(data).toBeDefined();
      const before = calls.length;

      // A re-rendered consumer passing a fresh inline closure is not
      // announcing a company switch — same credential, so nothing is dropped
      client.setAccessToken(async () => "token_fresh");
      await vi.waitFor(() =>
        expect(client.hydrate.getSnapshot().data).toBe(data),
      );
      expect(calls.length).toBe(before);
    });

    it("clears access-token mode when passed undefined", async () => {
      const { client } = makeClient(() =>
        jsonResponse(envelope(makeWireHydrate())),
      );
      await client.hydrate.refetch();

      client.setAccessToken(undefined);
      expect(client.hasAccessTokenMode).toBe(false);
      expect(() => client.hydrate).toThrow(/getAccessToken/);
    });

    it("does not refetch subscribed resources when clearing the token", async () => {
      const { client, calls } = makeClient(() =>
        jsonResponse(envelope(makeWireHydrate())),
      );
      const hydrate = client.hydrate;
      const unsubscribe = hydrate.subscribe(() => {});
      await hydrate.refetch();
      expect(calls).toHaveLength(1);

      // No credential remains, so a refetch could only fail; data is dropped
      // without issuing a doomed request
      client.setAccessToken(undefined);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(calls).toHaveLength(1);
      expect(hydrate.getSnapshot().data).toBeUndefined();
      expect(hydrate.getSnapshot().isPending).toBe(false);
      unsubscribe();
    });

    it("resets escape-hatch resources too", async () => {
      const { client } = makeClient(() =>
        jsonResponse(envelope(makeWireHydrate())),
      );
      const resource = client.resource("custom", async () => "old-company");
      await resource.refetch();
      expect(resource.getSnapshot().data).toBe("old-company");

      client.setAccessToken(async () => "token_new");
      expect(resource.getSnapshot().data).toBeUndefined();
    });
  });
});
