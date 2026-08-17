import { act, renderHook } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { useTruncatedList } from "./useTruncatedList";

const items = (count: number) =>
  Array.from({ length: count }, (_, index) => `item-${index}`);

describe("useTruncatedList", () => {
  test("collapses to the limit by default", () => {
    const { result } = renderHook(() =>
      useTruncatedList(items(18), { limit: 3 }),
    );

    expect(result.current.items).toEqual(["item-0", "item-1", "item-2"]);
    expect(result.current.total).toBe(18);
    expect(result.current.hiddenCount).toBe(15);
    expect(result.current.canExpand).toBe(true);
    expect(result.current.isExpanded).toBe(false);
  });

  test("toggles between the slice and the full list", () => {
    const all = items(18);
    const { result } = renderHook(() => useTruncatedList(all, { limit: 3 }));

    act(() => result.current.toggle());

    expect(result.current.items).toHaveLength(18);
    expect(result.current.isExpanded).toBe(true);
    expect(result.current.hiddenCount).toBe(0);

    act(() => result.current.toggle());

    expect(result.current.items).toHaveLength(3);
    expect(result.current.isExpanded).toBe(false);
    expect(result.current.hiddenCount).toBe(15);
  });

  test("cannot expand when the total equals the limit", () => {
    const { result } = renderHook(() =>
      useTruncatedList(items(3), { limit: 3 }),
    );

    expect(result.current.canExpand).toBe(false);
    expect(result.current.hiddenCount).toBe(0);
    expect(result.current.items).toHaveLength(3);
  });

  test("cannot expand when the list is empty", () => {
    const { result } = renderHook(() => useTruncatedList([], { limit: 3 }));

    expect(result.current.canExpand).toBe(false);
    expect(result.current.total).toBe(0);
    expect(result.current.items).toEqual([]);
  });

  test("stays expanded when the data refreshes into a new array", () => {
    const { result, rerender } = renderHook(
      ({ list }) => useTruncatedList(list, { limit: 3 }),
      { initialProps: { list: items(18) } },
    );

    act(() => result.current.toggle());
    expect(result.current.items).toHaveLength(18);

    // `useEmbed` hands back a fresh array on every poll.
    rerender({ list: items(18) });

    expect(result.current.isExpanded).toBe(true);
    expect(result.current.items).toHaveLength(18);
  });

  test("derives collapsed state when the list shrinks below the limit", () => {
    const { result, rerender } = renderHook(
      ({ list }) => useTruncatedList(list, { limit: 3 }),
      { initialProps: { list: items(18) } },
    );

    act(() => result.current.toggle());
    rerender({ list: items(2) });

    expect(result.current.canExpand).toBe(false);
    expect(result.current.isExpanded).toBe(false);
    expect(result.current.items).toHaveLength(2);
  });

  test("never mutates the input array", () => {
    const all = items(5);
    const { result } = renderHook(() => useTruncatedList(all, { limit: 3 }));

    act(() => result.current.toggle());
    act(() => result.current.toggle());

    expect(all).toEqual(items(5));
    expect(result.current.items).not.toBe(all);
  });
});
