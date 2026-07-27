import { useCallback, useMemo, useState } from "react";

export interface TruncatedList<T> {
  /** The first `limit` items while collapsed, every item while expanded. */
  items: T[];
  /** Total number of items before truncation. */
  total: number;
  /** How many items are hidden while collapsed. */
  hiddenCount: number;
  /** Only render an expand affordance when this is `true`. */
  canExpand: boolean;
  isExpanded: boolean;
  toggle: () => void;
  expand: () => void;
  collapse: () => void;
}

export interface UseTruncatedListOptions {
  limit: number;
}

/**
 * Headless truncation state for long lists.
 *
 * Returns a slice rather than rendering anything, so it composes with any
 * layout — including CSS-table rows, where an extra wrapper element would
 * break the anonymous table box.
 */
export function useTruncatedList<T>(
  items: T[],
  { limit }: UseTruncatedListOptions,
): TruncatedList<T> {
  const [isExpandedState, setIsExpanded] = useState(false);

  const total = items.length;
  const canExpand = total > limit;
  // Derived rather than stored: if the list shrinks below `limit`, a stale
  // `true` can never leak into the rendered slice.
  const isExpanded = canExpand && isExpandedState;

  // Deliberately no reset when `items` changes identity: `useEmbed` hands back
  // a new array on every data refresh, and collapsing there would yank the
  // list closed under the user's cursor.
  const visibleItems = useMemo(
    () => (canExpand && !isExpanded ? items.slice(0, limit) : items),
    [items, limit, canExpand, isExpanded],
  );

  const toggle = useCallback(() => setIsExpanded((prev) => !prev), []);
  const expand = useCallback(() => setIsExpanded(true), []);
  const collapse = useCallback(() => setIsExpanded(false), []);

  return {
    items: visibleItems,
    total,
    hiddenCount: Math.max(total - limit, 0),
    canExpand,
    isExpanded,
    toggle,
    expand,
    collapse,
  };
}
