import { renderHook } from "@testing-library/react";

import { useLatestRequestGuard } from "./useLatestRequestGuard";

describe("useLatestRequestGuard", () => {
  test("a request is not stale while it is the latest", () => {
    const { result } = renderHook(() => useLatestRequestGuard());

    const isStale = result.current();

    expect(isStale()).toBe(false);
  });

  test("an earlier request becomes stale when a newer one begins", () => {
    const { result } = renderHook(() => useLatestRequestGuard());

    const firstIsStale = result.current();
    const secondIsStale = result.current();

    expect(firstIsStale()).toBe(true);
    expect(secondIsStale()).toBe(false);
  });

  test("staleness is preserved across re-renders", () => {
    const { result, rerender } = renderHook(() => useLatestRequestGuard());

    const firstIsStale = result.current();
    rerender();
    const secondIsStale = result.current();
    rerender();

    expect(firstIsStale()).toBe(true);
    expect(secondIsStale()).toBe(false);
  });

  test("discards out-of-order async resolutions", async () => {
    const { result } = renderHook(() => useLatestRequestGuard());

    let resolveSlow: (value: string) => void = () => {};
    const slow = new Promise<string>((resolve) => {
      resolveSlow = resolve;
    });
    const fast = Promise.resolve("fast");

    let applied: string | undefined;
    const request = (promise: Promise<string>) => {
      const isStale = result.current();
      return promise.then((value) => {
        if (!isStale()) {
          applied = value;
        }
      });
    };

    const slowRequest = request(slow); // starts first
    const fastRequest = request(fast); // supersedes it

    await fastRequest;
    resolveSlow("slow");
    await slowRequest;

    expect(applied).toBe("fast");
  });
});
