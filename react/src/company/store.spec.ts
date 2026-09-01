import { vi } from "vitest";

import { KeyedResource, Resource, hashKey } from "./store";

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("Resource", () => {
  it("starts pending and loads on first subscribe", async () => {
    const fetcher = vi.fn(async () => "data");
    const resource = new Resource(fetcher);
    expect(resource.getSnapshot()).toEqual({
      data: undefined,
      error: undefined,
      isPending: true,
    });
    const listener = vi.fn();
    resource.subscribe(listener);
    await flush();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(resource.getSnapshot()).toEqual({
      data: "data",
      error: undefined,
      isPending: false,
    });
    expect(listener).toHaveBeenCalled();
  });

  it("is loaded from the start when seeded", async () => {
    const fetcher = vi.fn(async () => "fresh");
    const resource = new Resource(fetcher, "seed");
    resource.subscribe(() => {});
    await flush();
    expect(fetcher).not.toHaveBeenCalled();
    expect(resource.getSnapshot().data).toBe("seed");
  });

  it("deduplicates in-flight loads", async () => {
    const fetcher = vi.fn(async () => "data");
    const resource = new Resource(fetcher);
    void resource.load();
    void resource.load();
    await resource.refetch();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("keeps the last good data across a failed refetch", async () => {
    let fail = false;
    const resource = new Resource(async () => {
      if (fail) throw new Error("boom");
      return "good";
    });
    await resource.load();
    fail = true;
    await resource.refetch();
    expect(resource.getSnapshot()).toEqual({
      data: "good",
      error: new Error("boom"),
      isPending: false,
    });
    fail = false;
    await resource.refetch();
    expect(resource.getSnapshot().error).toBeUndefined();
  });

  it("extends the data on screen and reads as pending while it loads", async () => {
    const resource = new Resource(async () => "a");
    await resource.load();
    const extending = resource.extend(async (data) => `${data}b`);
    expect(resource.getSnapshot()).toMatchObject({
      data: "a",
      isPending: true,
    });
    await extending;
    expect(resource.getSnapshot()).toEqual({
      data: "ab",
      error: undefined,
      isPending: false,
    });
  });

  it("keeps the data on screen when an extend fails, and never rejects", async () => {
    const resource = new Resource(async () => "a");
    await resource.load();
    await expect(
      resource.extend(async () => {
        throw new Error("boom");
      }),
    ).resolves.toBeUndefined();
    expect(resource.getSnapshot()).toEqual({
      data: "a",
      error: new Error("boom"),
      isPending: false,
    });
    // The next page clears the failure.
    await resource.extend(async (data) => `${data}b`);
    expect(resource.getSnapshot()).toEqual({
      data: "ab",
      error: undefined,
      isPending: false,
    });
  });

  it("does not extend before there is data, and shares in-flight extends", async () => {
    const fetcher = vi.fn(async (data: string) => `${data}b`);
    const resource = new Resource(async () => "a");
    await resource.extend(fetcher);
    expect(fetcher).not.toHaveBeenCalled();
    expect(resource.getSnapshot().data).toBeUndefined();

    await resource.load();
    const first = resource.extend(fetcher);
    const second = resource.extend(fetcher);
    expect(second).toBe(first);
    await first;
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(resource.getSnapshot().data).toBe("ab");
  });

  it("discards a page whose resource was reset or seeded under it", async () => {
    let release: (() => void) | undefined;
    const resource = new Resource(async () => "a");
    await resource.load();
    const extending = resource.extend(
      async (data) =>
        new Promise<string>((resolve) => {
          release = () => resolve(`${data}b`);
        }),
    );
    // The fetcher runs a microtask after extend() returns.
    await flush();
    resource.seed("fresh");
    release?.();
    await extending;
    expect(resource.getSnapshot().data).toBe("fresh");
    // The abandoned page does not block the next one.
    await resource.extend(async (data) => `${data}!`);
    expect(resource.getSnapshot().data).toBe("fresh!");
  });

  it("wraps non-Error rejections", async () => {
    const resource = new Resource(async () => {
      throw "nope";
    });
    await resource.load();
    expect(resource.getSnapshot().error?.message).toBe("nope");
  });

  it("reset forgets data and reloads when subscribed", async () => {
    let value = 1;
    const fetcher = vi.fn(async () => value++);
    const resource = new Resource(fetcher);
    resource.subscribe(() => {});
    await flush();
    expect(resource.getSnapshot().data).toBe(1);
    resource.reset();
    expect(resource.getSnapshot()).toEqual({
      data: undefined,
      error: undefined,
      isPending: true,
    });
    await flush();
    expect(resource.getSnapshot().data).toBe(2);
  });

  it("reset without subscribers does not load", async () => {
    const fetcher = vi.fn(async () => "x");
    const resource = new Resource(fetcher);
    resource.reset();
    await flush();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("a response from before a reset is discarded", async () => {
    let resolveFirst: (v: string) => void = () => {};
    let calls = 0;
    const resource = new Resource(
      () =>
        new Promise<string>((resolve) => {
          calls += 1;
          if (calls === 1) {
            resolveFirst = resolve;
          } else {
            resolve("second");
          }
        }),
    );
    resource.subscribe(() => {});
    resource.reset();
    await flush();
    resolveFirst("first");
    await flush();
    expect(resource.getSnapshot().data).toBe("second");
  });

  it("update changes loaded data in place and is a no-op before load", () => {
    const resource = new Resource(async () => [1]);
    resource.update((d) => [...d, 2]);
    expect(resource.getSnapshot().data).toBeUndefined();
    resource.seed([1]);
    resource.update((d) => [...d, 2]);
    expect(resource.getSnapshot().data).toEqual([1, 2]);
  });
});

describe("hashKey", () => {
  it("is order-insensitive and drops undefined", () => {
    expect(hashKey({ b: 1, a: undefined })).toBe(hashKey({ b: 1 }));
    expect(hashKey({ a: 1, b: 2 })).toBe(hashKey({ b: 2, a: 1 }));
    expect(hashKey({ a: [1, { y: 2, x: 1 }] })).toBe(
      hashKey({ a: [1, { x: 1, y: 2 }] }),
    );
    expect(hashKey({ a: 1 })).not.toBe(hashKey({ a: 2 }));
    expect(hashKey({})).toBe("{}");
  });
});

describe("KeyedResource", () => {
  const keyed = (maxIdle?: number) => {
    const fetcher = vi.fn(async (p: { q: string }) => `data:${p.q}`);
    return {
      fetcher,
      keyed: new KeyedResource(fetcher, { eviction: { maxIdle } }),
    };
  };

  it("creates one Resource per distinct key and reuses it", async () => {
    const { keyed: k, fetcher } = keyed();
    const a = k.get({ q: "a" });
    expect(k.get({ q: "a" })).toBe(a);
    expect(k.get({ q: "b" })).not.toBe(a);
    expect(k.size).toBe(2);
    k.subscribe({ q: "a" }, () => {});
    await flush();
    expect(fetcher).toHaveBeenCalledWith({ q: "a" }, undefined);
    expect(a.getSnapshot().data).toBe("data:a");
  });

  it("passes the current data to the fetcher on refetch", async () => {
    const { keyed: k, fetcher } = keyed();
    const a = k.get({ q: "a" });
    await a.load();
    await a.refetch();
    expect(fetcher).toHaveBeenLastCalledWith({ q: "a" }, "data:a");
  });

  it("evicts least recently used idle entries beyond maxIdle", () => {
    const { keyed: k } = keyed(2);
    k.get({ q: "a" });
    k.get({ q: "b" });
    k.get({ q: "c" });
    expect(k.entries().map((e) => e.params.q)).toEqual(["b", "c"]);
    k.get({ q: "b" }); // touch b: c is now the oldest
    k.get({ q: "d" });
    expect(k.entries().map((e) => e.params.q)).toEqual(["b", "d"]);
  });

  it("never evicts a subscribed entry, and evicts on unsubscribe", () => {
    const { keyed: k } = keyed(1);
    const unsubscribe = k.subscribe({ q: "a" }, () => {});
    k.get({ q: "b" });
    k.get({ q: "c" });
    expect(k.has({ q: "a" })).toBe(true);
    expect(k.has({ q: "b" })).toBe(false);
    expect(k.has({ q: "c" })).toBe(true);
    unsubscribe();
    // a became idle and is older than c
    expect(k.has({ q: "a" })).toBe(false);
    expect(k.size).toBe(1);
  });

  it("resetAll drops idle entries and resets subscribed ones", async () => {
    const { keyed: k, fetcher } = keyed();
    k.subscribe({ q: "a" }, () => {});
    k.get({ q: "b" });
    await flush();
    k.resetAll();
    expect(k.has({ q: "b" })).toBe(false);
    expect(k.get({ q: "a" }).getSnapshot().isPending).toBe(true);
    await flush();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("invalidateAll refetches only loaded entries", async () => {
    const { keyed: k, fetcher } = keyed();
    await k.get({ q: "a" }).load();
    k.get({ q: "b" });
    k.invalidateAll();
    await flush();
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls.every(([p]) => p.q === "a")).toBe(true);
  });

  it("seed and evict address entries by params", () => {
    const { keyed: k } = keyed();
    k.seed({ q: "a" }, "seeded");
    expect(k.get({ q: "a" }).getSnapshot().data).toBe("seeded");
    expect(k.evict({ q: "a" })).toBe(true);
    expect(k.has({ q: "a" })).toBe(false);
  });

  it("accepts a custom hash", () => {
    const k = new KeyedResource(async (p: { q: string }) => p.q, {
      hash: (p) => p.q.toLowerCase(),
    });
    expect(k.get({ q: "A" })).toBe(k.get({ q: "a" }));
  });
});
