import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { QueryStore } from "./queryStore";

describe("QueryStore", () => {
  it("starts idle with a stable snapshot reference", () => {
    const store = new QueryStore();
    const first = store.getState("plans");
    expect(first.status).toBe("idle");
    expect(store.getState("plans")).toBe(first);
    expect(store.getState("other")).toBe(first);
  });

  it("fetches and caches a successful result", async () => {
    const store = new QueryStore();
    const fetcher = vi.fn().mockResolvedValue(["plan_a"]);
    await expect(store.fetch("plans", fetcher)).resolves.toEqual(["plan_a"]);
    const state = store.getState<string[]>("plans");
    expect(state.status).toBe("success");
    expect(state.data).toEqual(["plan_a"]);
    expect(state.isFetching).toBe(false);
    expect(state.updatedAt).toBeTypeOf("number");
  });

  it("dedupes concurrent fetches for the same key", async () => {
    const store = new QueryStore();
    let resolveFetch: (value: string) => void = () => {};
    const fetcher = vi.fn(
      () => new Promise<string>((resolve) => (resolveFetch = resolve)),
    );
    const first = store.fetch("plans", fetcher);
    const second = store.fetch("plans", fetcher);
    resolveFetch("result");
    await expect(first).resolves.toBe("result");
    await expect(second).resolves.toBe("result");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("does not dedupe across different keys", async () => {
    const store = new QueryStore();
    const fetcher = vi.fn().mockResolvedValue("x");
    await store.fetch("a", fetcher);
    await store.fetch("b", fetcher);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  describe("staleness", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-08-05T12:00:00Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("serves from cache within staleTime and refetches after", async () => {
      const store = new QueryStore();
      const fetcher = vi
        .fn()
        .mockResolvedValueOnce("first")
        .mockResolvedValueOnce("second");

      await store.fetch("plans", fetcher, { staleTime: 30_000 });
      await expect(
        store.fetch("plans", fetcher, { staleTime: 30_000 }),
      ).resolves.toBe("first");
      expect(fetcher).toHaveBeenCalledTimes(1);

      vi.setSystemTime(new Date("2026-08-05T12:00:31Z"));
      await expect(
        store.fetch("plans", fetcher, { staleTime: 30_000 }),
      ).resolves.toBe("second");
      expect(fetcher).toHaveBeenCalledTimes(2);
    });

    it("refetches by default (staleTime 0)", async () => {
      const store = new QueryStore();
      const fetcher = vi.fn().mockResolvedValue("x");
      await store.fetch("plans", fetcher);
      await store.fetch("plans", fetcher);
      expect(fetcher).toHaveBeenCalledTimes(2);
    });

    it("force bypasses freshness", async () => {
      const store = new QueryStore();
      const fetcher = vi.fn().mockResolvedValue("x");
      await store.fetch("plans", fetcher, { staleTime: 60_000 });
      await store.fetch("plans", fetcher, { staleTime: 60_000, force: true });
      expect(fetcher).toHaveBeenCalledTimes(2);
    });
  });

  it("keeps previous data during a refetch (stale-while-revalidate)", async () => {
    const store = new QueryStore();
    await store.fetch("plans", () => Promise.resolve("old"));

    let resolveFetch: (value: string) => void = () => {};
    const refetch = store.fetch(
      "plans",
      () => new Promise<string>((resolve) => (resolveFetch = resolve)),
    );
    const during = store.getState<string>("plans");
    expect(during.status).toBe("success");
    expect(during.data).toBe("old");
    expect(during.isFetching).toBe(true);
    resolveFetch("new");
    await refetch;
    expect(store.getState<string>("plans").data).toBe("new");
  });

  it("records errors while retaining previous data", async () => {
    const store = new QueryStore();
    await store.fetch("plans", () => Promise.resolve("good"));
    const failure = new Error("boom");
    await expect(
      store.fetch("plans", () => Promise.reject(failure)),
    ).rejects.toThrow("boom");
    const state = store.getState<string>("plans");
    expect(state.status).toBe("error");
    expect(state.error).toBe(failure);
    expect(state.data).toBe("good");
    expect(state.isFetching).toBe(false);
  });

  it("notifies subscribers on state changes and stops after unsubscribe", async () => {
    const store = new QueryStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe("plans", listener);
    await store.fetch("plans", () => Promise.resolve("x"));
    // one notification entering loading, one on success
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    await store.fetch("plans", () => Promise.resolve("y"));
    expect(listener).toHaveBeenCalledTimes(2);
  });

  describe("invalidate", () => {
    it("marks matching entries stale and notifies", async () => {
      const store = new QueryStore();
      await store.fetch("checkout.hydrate/cmpn_1", () => Promise.resolve("a"));
      await store.fetch("checkout.invoices", () => Promise.resolve("b"));
      await store.fetch("public.plans", () => Promise.resolve("c"));
      const listener = vi.fn();
      store.subscribe("checkout.hydrate/cmpn_1", listener);

      store.invalidate("checkout.");
      expect(listener).toHaveBeenCalledTimes(1);
      expect(store.getState("checkout.hydrate/cmpn_1").isInvalidated).toBe(
        true,
      );
      expect(store.getState("checkout.invoices").isInvalidated).toBe(true);
      expect(store.getState("public.plans").isInvalidated).toBe(false);
    });

    it("invalidates everything with no argument", async () => {
      const store = new QueryStore();
      await store.fetch("a", () => Promise.resolve(1));
      await store.fetch("b", () => Promise.resolve(2));
      store.invalidate();
      expect(store.getState("a").isInvalidated).toBe(true);
      expect(store.getState("b").isInvalidated).toBe(true);
    });

    it("an invalidated entry refetches even within staleTime", async () => {
      const store = new QueryStore();
      const fetcher = vi
        .fn()
        .mockResolvedValueOnce("first")
        .mockResolvedValueOnce("second");
      await store.fetch("plans", fetcher, { staleTime: 60_000 });
      store.invalidate("plans");
      await expect(
        store.fetch("plans", fetcher, { staleTime: 60_000 }),
      ).resolves.toBe("second");
      expect(fetcher).toHaveBeenCalledTimes(2);
    });
  });

  it("remove() drops entries and notifies", async () => {
    const store = new QueryStore();
    await store.fetch("checkout.hydrate", () => Promise.resolve("a"));
    const listener = vi.fn();
    store.subscribe("checkout.hydrate", listener);
    store.remove("checkout.");
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getState("checkout.hydrate").status).toBe("idle");
  });

  it("remove() marks entries invalidated so mounted subscribers refetch", async () => {
    const store = new QueryStore();
    await store.fetch("checkout.hydrate", () => Promise.resolve("a"));
    store.remove("checkout.");
    const state = store.getState("checkout.hydrate");
    expect(state.status).toBe("idle");
    expect(state.data).toBeUndefined();
    expect(state.isInvalidated).toBe(true);
  });

  describe("in-flight lifecycle", () => {
    it("discards an in-flight result that lands after remove()", async () => {
      const store = new QueryStore();
      let resolveFetch: (value: string) => void = () => {};
      const inflight = store.fetch(
        "checkout.hydrate",
        () => new Promise<string>((resolve) => (resolveFetch = resolve)),
      );

      store.remove();
      resolveFetch("user-a-data");
      await inflight;

      const state = store.getState<string>("checkout.hydrate");
      expect(state.data).toBeUndefined();
      expect(state.status).toBe("idle");
    });

    it("does not dedupe a new fetch onto a request disowned by remove()", async () => {
      const store = new QueryStore();
      let resolveOld: (value: string) => void = () => {};
      const oldFetch = store.fetch(
        "account",
        () => new Promise<string>((resolve) => (resolveOld = resolve)),
      );

      store.remove();
      const fresh = await store.fetch("account", () =>
        Promise.resolve("user-b-data"),
      );
      expect(fresh).toBe("user-b-data");

      resolveOld("user-a-data");
      await oldFetch;
      expect(store.getState<string>("account").data).toBe("user-b-data");
    });

    it("an invalidation during a flight marks the landed result stale and refetches", async () => {
      const store = new QueryStore();
      let resolveFirst: (value: string) => void = () => {};
      const fetcher = vi
        .fn()
        .mockImplementationOnce(
          () => new Promise<string>((resolve) => (resolveFirst = resolve)),
        )
        .mockResolvedValueOnce("post-mutation");

      const first = store.fetch("checkout.hydrate", fetcher, {
        staleTime: 60_000,
      });
      store.invalidate("checkout.");
      resolveFirst("pre-mutation");
      await first;

      // The follow-up fetch runs automatically; wait for it to settle
      await vi.waitFor(() => {
        expect(store.getState<string>("checkout.hydrate").data).toBe(
          "post-mutation",
        );
      });
      expect(fetcher).toHaveBeenCalledTimes(2);
      expect(store.getState("checkout.hydrate").isInvalidated).toBe(false);
    });

    it("an error landing after remove() does not resurrect the entry", async () => {
      const store = new QueryStore();
      let rejectFetch: (error: Error) => void = () => {};
      const inflight = store.fetch(
        "checkout.hydrate",
        () => new Promise<string>((_, reject) => (rejectFetch = reject)),
      );

      store.remove();
      rejectFetch(new Error("stale failure"));
      await expect(inflight).rejects.toThrow("stale failure");

      const state = store.getState("checkout.hydrate");
      expect(state.status).toBe("idle");
      expect(state.error).toBeUndefined();
    });
  });
});
