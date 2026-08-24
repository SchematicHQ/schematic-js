import { vi } from "vitest";

import { Resource } from "./store";

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
