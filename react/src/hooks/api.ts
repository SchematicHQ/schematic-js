import * as SchematicJS from "@schematichq/schematic-js";
import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";

import { useSchematic } from "../context";

/**
 * Returns the configured API clients, grouped by the credential they require:
 * `public.*` (publishable key) and `checkout` (temporary access token).
 */
export const useSchematicApi = (): SchematicJS.SchematicApi => {
  const { api } = useSchematic();
  return api;
};

export interface UseSchematicQueryOpts {
  /**
   * How long (ms) a successful result stays fresh; while fresh, re-mounts
   * resolve from cache without refetching. Default 0 (refetch on mount,
   * deduped against in-flight requests).
   */
  staleTime?: number;
  /** Set false to hold off fetching (e.g. while inputs are incomplete) */
  enabled?: boolean;
}

export type UseSchematicQueryResult<TData> = SchematicJS.QueryState<TData> & {
  /** Refetch immediately, bypassing freshness; resolves with fresh data */
  refetch: () => Promise<TData>;
};

/**
 * Caches an async API call in the provider's QueryStore under `key`.
 * Concurrent mounts of the same key share one request; entries invalidated
 * via useSchematicInvalidate refetch automatically while mounted. Keys are
 * consumer-defined; hierarchical keys (e.g. "checkout.hydrate/cmpn_123")
 * compose with prefix invalidation.
 */
export const useSchematicQuery = <TData>(
  key: string,
  fetcher: () => Promise<TData>,
  opts: UseSchematicQueryOpts = {},
): UseSchematicQueryResult<TData> => {
  const { api } = useSchematic();
  const store = api.queryStore;
  const { staleTime = 0, enabled = true } = opts;

  // Keep the latest fetcher without making it an effect dependency, so
  // inline closures don't trigger refetch loops
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const subscribe = useCallback(
    (callback: () => void) => store.subscribe(key, callback),
    [store, key],
  );

  const getSnapshot = useCallback(
    () => store.getState<TData>(key),
    [store, key],
  );

  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  // Errors are surfaced through the query state, so rejections are swallowed
  // here. Fetch-on-mount and fetch-on-invalidation are separate effects: if
  // they were one effect keyed on isInvalidated, the flag flipping back to
  // false after a refetch would re-run it and issue a redundant request.
  const isInvalidated = state.isInvalidated;
  useEffect(() => {
    if (!enabled) {
      return;
    }
    store.fetch(key, () => fetcherRef.current(), { staleTime }).catch(() => {});
  }, [store, key, enabled, staleTime]);

  useEffect(() => {
    if (!enabled || !isInvalidated) {
      return;
    }
    store.fetch(key, () => fetcherRef.current(), { staleTime }).catch(() => {});
  }, [store, key, enabled, staleTime, isInvalidated]);

  const refetch = useCallback(
    () => store.fetch(key, () => fetcherRef.current(), { force: true }),
    [store, key],
  );

  return { ...state, refetch };
};

/**
 * Returns an invalidator for cached query entries: no argument invalidates
 * everything, a string invalidates every key equal to it or starting with it.
 * Call after mutations (e.g. a successful checkout) to refetch affected data.
 */
export const useSchematicInvalidate = () => {
  const { api } = useSchematic();
  return useCallback(
    (keyOrPrefix?: string) => api.queryStore.invalidate(keyOrPrefix),
    [api],
  );
};
