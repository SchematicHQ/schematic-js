import { describe, expect, test, vi } from "vitest";

import { debounceByKey } from "./debounce";

const LEADING = { leading: true, trailing: false };

describe("debounceByKey", () => {
  test("keeps separate keys separate within one window", () => {
    const fn = vi.fn((key: string) => `result:${key}`);
    const debounced = debounceByKey(fn, 300, LEADING);

    // Two resources fetching in the same tick, as one `MeteredFeatures` does
    // when a company has more than one credit.
    expect(debounced("credit-a")).toBe("result:credit-a");
    expect(debounced("credit-b")).toBe("result:credit-b");

    expect(fn).toHaveBeenCalledTimes(2);
  });

  test("still collapses repeat calls for the same key", () => {
    const fn = vi.fn((key: string) => `result:${key}`);
    const debounced = debounceByKey(fn, 300, LEADING);

    expect(debounced("credit-a")).toBe("result:credit-a");
    expect(debounced("credit-a")).toBe("result:credit-a");

    expect(fn).toHaveBeenCalledTimes(1);
  });

  test("forwards the remaining arguments", () => {
    const fn = vi.fn((key: string, limit?: number) => `${key}:${limit}`);
    const debounced = debounceByKey(fn, 300, LEADING);

    expect(debounced("credit-a", 20)).toBe("credit-a:20");
    expect(fn).toHaveBeenCalledWith("credit-a", 20);
  });
});
