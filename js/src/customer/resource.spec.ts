import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Resource } from "./resource";

describe("Resource", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("moves from pending to data and notifies subscribers", async () => {
    const resource = new Resource(async () => "value");
    const listener = vi.fn();
    resource.subscribe(listener);

    expect(resource.getSnapshot().isPending).toBe(true);
    await resource.ensure();
    const snapshot = resource.getSnapshot();
    expect(snapshot.data).toBe("value");
    expect(snapshot.isPending).toBe(false);
    expect(snapshot.error).toBeUndefined();
    expect(listener).toHaveBeenCalled();
    // Snapshot identity is stable until the next state change.
    expect(resource.getSnapshot()).toBe(snapshot);
  });

  it("captures errors and clears them on a successful refetch", async () => {
    let fail = true;
    const resource = new Resource(async () => {
      if (fail) throw new Error("boom");
      return "recovered";
    });
    await resource.ensure();
    expect(resource.getSnapshot().error?.message).toBe("boom");
    fail = false;
    await resource.refetch();
    expect(resource.getSnapshot().error).toBeUndefined();
    expect(resource.getSnapshot().data).toBe("recovered");
  });

  it("ensure() is a no-op while fresh and refetches when stale", async () => {
    const fetcher = vi.fn().mockResolvedValue("v");
    const resource = new Resource(fetcher, { staleTimeMs: 1000 });
    await resource.ensure();
    await resource.ensure();
    expect(fetcher).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1500);
    await resource.ensure();
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(resource.getSnapshot().isRefetching).toBe(false);
  });

  it("a superseded in-flight fetch cannot clobber newer state", async () => {
    let resolveFirst: (value: string) => void = () => {};
    let call = 0;
    const resource = new Resource(
      () =>
        new Promise<string>((resolve) => {
          call += 1;
          if (call === 1) {
            resolveFirst = resolve;
          } else {
            resolve("second");
          }
        }),
    );
    const first = resource.ensure();
    const second = resource.refetch();
    resolveFirst("first");
    await Promise.all([first, second]);
    expect(resource.getSnapshot().data).toBe("second");
  });

  it("reset returns to idle and setFetcher swaps sources", async () => {
    const resource = new Resource(async () => "a");
    await resource.ensure();
    resource.setFetcher(async () => "b");
    expect(resource.getSnapshot().data).toBeUndefined();
    expect(resource.getSnapshot().isPending).toBe(true);
    await resource.ensure();
    expect(resource.getSnapshot().data).toBe("b");
  });
});

describe("Resource single flight", () => {
  it("a listener calling ensure() during the start notification joins the request", async () => {
    let fetches = 0;
    const resource = new Resource(async () => {
      fetches += 1;
      return "ok";
    });
    resource.subscribe(() => {
      void resource.ensure();
    });
    await resource.ensure();
    expect(fetches).toBe(1);
    expect(resource.getSnapshot().data).toBe("ok");
  });
});

describe("Resource errors", () => {
  it("a fetcher that throws synchronously settles as an error, not a permanent pending", async () => {
    let attempt = 0;
    const resource = new Resource<string>(() => {
      attempt += 1;
      if (attempt === 1) {
        throw new Error("sync boom");
      }
      return Promise.resolve("ok");
    });
    await resource.ensure();
    expect(resource.getSnapshot().isPending).toBe(false);
    expect(resource.getSnapshot().error?.message).toBe("sync boom");
    await resource.ensure();
    expect(resource.getSnapshot().data).toBe("ok");
  });

  it("never treats a failure as fresh: the next ensure() retries", async () => {
    let attempt = 0;
    const resource = new Resource(async () => {
      attempt += 1;
      if (attempt === 1) {
        throw new Error("boom");
      }
      return "ok";
    });
    await resource.ensure();
    expect(resource.getSnapshot().error?.message).toBe("boom");
    await resource.ensure();
    expect(attempt).toBe(2);
    expect(resource.getSnapshot().data).toBe("ok");
    expect(resource.getSnapshot().error).toBeUndefined();
  });
});
