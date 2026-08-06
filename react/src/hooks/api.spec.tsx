import { componentspublic } from "@schematichq/schematic-js";
import { act, renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  SchematicProvider,
  useSchematicApi,
  useSchematicInvalidate,
  useSchematicQuery,
} from "../index";

const mockFetch = vi.fn();
globalThis.fetch = mockFetch as typeof fetch;

const jsonResponse = (status: number, body: unknown = {}): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const wrapperFor = (
  props: Partial<React.ComponentProps<typeof SchematicProvider>> = {},
) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <SchematicProvider publishableKey="api_test" {...props}>
      {children}
    </SchematicProvider>
  );
  return Wrapper;
};

describe("useSchematicApi", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns clients grouped by credential", () => {
    const { result } = renderHook(() => useSchematicApi(), {
      wrapper: wrapperFor(),
    });
    expect(result.current.public.plans).toBeInstanceOf(
      componentspublic.ComponentspublicApi,
    );
    expect(result.current.public.accounts).toBeDefined();
    expect(result.current.public.events).toBeDefined();
    expect(result.current.public.features).toBeDefined();
    expect(result.current.checkout).toBeDefined();
    expect(result.current.tokenManager).toBeUndefined();
  });

  it("sends the publishable key and client version on public calls", async () => {
    mockFetch.mockResolvedValue(jsonResponse(200, { data: { plans: [] } }));
    const { result } = renderHook(() => useSchematicApi(), {
      wrapper: wrapperFor(),
    });
    await result.current.public.plans.getPublicPlansRaw({});
    const [url, init] = mockFetch.mock.calls[0];
    expect(String(url)).toContain("/public/plans");
    expect(init.headers["X-Schematic-Api-Key"]).toBe("api_test");
    expect(init.headers["X-Schematic-Client-Version"]).toMatch(
      /^schematic-react@/,
    );
  });

  it("rejects checkout calls with a setup error when no accessToken is configured", async () => {
    const { result } = renderHook(() => useSchematicApi(), {
      wrapper: wrapperFor(),
    });
    await expect(result.current.checkout.hydrate()).rejects.toThrow(
      /no accessToken was configured/,
    );
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("authenticates checkout calls with a static token", async () => {
    mockFetch.mockResolvedValue(jsonResponse(200, { data: {} }));
    const { result } = renderHook(() => useSchematicApi(), {
      wrapper: wrapperFor({ accessToken: "token_static" }),
    });
    await result.current.checkout.hydrateRaw({});
    const [url, init] = mockFetch.mock.calls[0];
    expect(String(url)).toContain("/components/hydrate");
    expect(init.headers["X-Schematic-Api-Key"]).toBe("token_static");
  });

  it("mints lazily via resolver and replays once on 401", async () => {
    const resolver = vi
      .fn()
      .mockResolvedValueOnce("token_stale")
      .mockResolvedValueOnce("token_fresh");
    mockFetch
      .mockResolvedValueOnce(jsonResponse(401))
      .mockResolvedValueOnce(jsonResponse(200, { data: {} }));

    const { result } = renderHook(() => useSchematicApi(), {
      wrapper: wrapperFor({ accessToken: resolver }),
    });
    expect(resolver).not.toHaveBeenCalled();

    await result.current.checkout.hydrateRaw({});

    expect(resolver).toHaveBeenCalledTimes(2);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    const [, retryInit] = mockFetch.mock.calls[1];
    expect(retryInit.headers["X-Schematic-Api-Key"]).toBe("token_fresh");
  });

  it("rebuilds the token manager when accessToken changes, preserving the query store", () => {
    let accessToken = "token_one";
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SchematicProvider publishableKey="api_test" accessToken={accessToken}>
        {children}
      </SchematicProvider>
    );
    const { result, rerender } = renderHook(() => useSchematicApi(), {
      wrapper,
    });
    const firstApi = result.current;
    accessToken = "token_two";
    rerender();
    expect(result.current).not.toBe(firstApi);
    expect(result.current.tokenManager).not.toBe(firstApi.tokenManager);
    expect(result.current.queryStore).toBe(firstApi.queryStore);
  });
});

describe("useSchematicQuery", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("fetches on mount and exposes data", async () => {
    const fetcher = vi.fn().mockResolvedValue(["plan_a"]);
    const { result } = renderHook(
      () => useSchematicQuery("plans", fetcher),
      { wrapper: wrapperFor() },
    );
    await waitFor(() => expect(result.current.status).toBe("success"));
    expect(result.current.data).toEqual(["plan_a"]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("shares one request between concurrently mounted hooks with the same key", async () => {
    const fetcher = vi.fn().mockResolvedValue("shared");
    const wrapper = wrapperFor();
    const { result } = renderHook(
      () => ({
        a: useSchematicQuery("shared-key", fetcher),
        b: useSchematicQuery("shared-key", fetcher),
      }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.a.status).toBe("success"));
    expect(result.current.b.data).toBe("shared");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("exposes errors through state", async () => {
    const failure = new Error("boom");
    const fetcher = vi.fn().mockRejectedValue(failure);
    const { result } = renderHook(
      () => useSchematicQuery("failing", fetcher),
      { wrapper: wrapperFor() },
    );
    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.error).toBe(failure);
  });

  it("does not fetch when disabled", async () => {
    const fetcher = vi.fn().mockResolvedValue("x");
    const { result } = renderHook(
      () => useSchematicQuery("disabled", fetcher, { enabled: false }),
      { wrapper: wrapperFor() },
    );
    await act(async () => {});
    expect(fetcher).not.toHaveBeenCalled();
    expect(result.current.status).toBe("idle");
  });

  it("refetches mounted queries after invalidation", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce("first")
      .mockResolvedValueOnce("second");
    const wrapper = wrapperFor();
    const { result } = renderHook(
      () => ({
        query: useSchematicQuery("inv-key", fetcher, { staleTime: 60_000 }),
        invalidate: useSchematicInvalidate(),
      }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.query.data).toBe("first"));

    act(() => result.current.invalidate("inv-key"));
    await waitFor(() => expect(result.current.query.data).toBe("second"));
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("performs exactly one refetch per invalidation at default staleTime", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce("first")
      .mockResolvedValueOnce("second");
    const wrapper = wrapperFor();
    const { result } = renderHook(
      () => ({
        query: useSchematicQuery("single-refetch", fetcher),
        invalidate: useSchematicInvalidate(),
      }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.query.data).toBe("first"));

    act(() => result.current.invalidate("single-refetch"));
    await waitFor(() => expect(result.current.query.data).toBe("second"));
    // The isInvalidated flag flipping back to false must not fetch again
    await act(async () => {});
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("clears cached query data when accessToken changes", async () => {
    let accessToken = "token_one";
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SchematicProvider publishableKey="api_test" accessToken={accessToken}>
        {children}
      </SchematicProvider>
    );
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce("company-a")
      .mockResolvedValueOnce("company-b");
    const { result, rerender } = renderHook(
      () =>
        useSchematicQuery("checkout.hydrate", fetcher, { staleTime: 60_000 }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.data).toBe("company-a"));

    accessToken = "token_two";
    rerender();
    // The credential swap drops the old company's data and refetches
    await waitFor(() => expect(result.current.data).toBe("company-b"));
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("refetch() bypasses freshness and resolves with fresh data", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce("first")
      .mockResolvedValueOnce("second");
    const { result } = renderHook(
      () => useSchematicQuery("refetch-key", fetcher, { staleTime: 60_000 }),
      { wrapper: wrapperFor() },
    );
    await waitFor(() => expect(result.current.data).toBe("first"));
    let refetched: string | undefined;
    await act(async () => {
      refetched = await result.current.refetch();
    });
    expect(refetched).toBe("second");
    expect(result.current.data).toBe("second");
  });
});
