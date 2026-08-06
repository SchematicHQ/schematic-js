export type QueryStatus = "idle" | "loading" | "success" | "error";

export interface QueryState<TData = unknown> {
  status: QueryStatus;
  data?: TData;
  error?: unknown;
  /** Epoch ms of the last successful fetch */
  updatedAt?: number;
  /** True while a fetch for this key is in flight (including background refetches) */
  isFetching: boolean;
  /** True when the entry has been invalidated and awaits a refetch */
  isInvalidated: boolean;
}

export interface FetchQueryOptions {
  /**
   * How long (ms) a successful result stays fresh; while fresh, fetch()
   * resolves from cache without invoking the fetcher. Default 0 (always
   * refetch, deduped against in-flight requests).
   */
  staleTime?: number;
  /** Bypass freshness and refetch (still shares any in-flight request) */
  force?: boolean;
}

const IDLE_STATE: QueryState = Object.freeze({
  status: "idle" as const,
  isFetching: false,
  isInvalidated: false,
});

// The post-remove() snapshot: no data, but marked invalidated so mounted
// subscribers know to refetch
const REMOVED_STATE: QueryState = Object.freeze({
  status: "idle" as const,
  isFetching: false,
  isInvalidated: true,
});

/**
 * A minimal framework-agnostic query cache: keyed immutable state entries,
 * in-flight request deduplication, staleness, prefix invalidation, and a
 * per-key listener API shaped for React's useSyncExternalStore (snapshots are
 * stable references that change only when the entry changes).
 *
 * Keys are consumer-defined strings; hierarchical keys (e.g.
 * "checkout.hydrate/cmpn_123") compose with prefix invalidation.
 *
 * Lifecycle events are tracked per key: invalidate() bumps an epoch so a
 * response that was already in flight cannot mark the entry fresh (a
 * follow-up fetch is issued instead), and remove() disowns in-flight
 * requests entirely so their results are discarded when they land.
 */
export class QueryStore {
  private states = new Map<string, QueryState>();
  private inflight = new Map<string, Promise<unknown>>();
  private listeners = new Map<string, Set<() => void>>();
  private epochs = new Map<string, number>();

  getState<TData = unknown>(key: string): QueryState<TData> {
    return (this.states.get(key) ?? IDLE_STATE) as QueryState<TData>;
  }

  subscribe(key: string, listener: () => void): () => void {
    let keyListeners = this.listeners.get(key);
    if (keyListeners === undefined) {
      keyListeners = new Set();
      this.listeners.set(key, keyListeners);
    }
    keyListeners.add(listener);
    return () => {
      keyListeners.delete(listener);
      if (keyListeners.size === 0) {
        this.listeners.delete(key);
      }
    };
  }

  /**
   * Fetches the entry for `key`, resolving from cache while fresh and sharing
   * a single in-flight request between concurrent callers. Previous data is
   * retained during refetches and on errors (stale-while-revalidate). If the
   * entry is invalidated while a request is in flight, the landed result does
   * not count as fresh and a follow-up fetch is issued automatically.
   */
  async fetch<TData>(
    key: string,
    fetcher: () => Promise<TData>,
    options: FetchQueryOptions = {},
  ): Promise<TData> {
    const { staleTime = 0, force = false } = options;

    const existing = this.inflight.get(key);
    if (existing !== undefined) {
      return existing as Promise<TData>;
    }

    const state = this.getState<TData>(key);
    if (
      !force &&
      state.status === "success" &&
      !state.isInvalidated &&
      state.updatedAt !== undefined &&
      Date.now() - state.updatedAt < staleTime
    ) {
      return state.data as TData;
    }

    this.setState(key, {
      ...state,
      status: state.status === "success" ? "success" : "loading",
      isFetching: true,
    });

    const startEpoch = this.epochOf(key);
    // The async body needs its own promise's identity to check ownership;
    // the ref is populated before the first await resumes
    const promiseRef: { current?: Promise<TData> } = {};
    const promise: Promise<TData> = (async () => {
      let data: TData;
      try {
        data = await fetcher();
      } catch (error) {
        // Only record the failure if this request still owns the entry
        // (remove() disowns in-flight requests)
        if (this.inflight.get(key) === promiseRef.current) {
          this.inflight.delete(key);
          const previous = this.getState<TData>(key);
          this.setState(key, {
            ...previous,
            status: "error",
            error,
            isFetching: false,
          });
        }
        throw error;
      }

      if (this.inflight.get(key) !== promiseRef.current) {
        // The entry was removed (or superseded) while this request was in
        // flight; its result must not resurrect the entry
        return data;
      }
      this.inflight.delete(key);

      const invalidatedDuringFlight = this.epochOf(key) !== startEpoch;
      this.setState(key, {
        status: "success",
        data,
        error: undefined,
        updatedAt: Date.now(),
        isFetching: false,
        isInvalidated: invalidatedDuringFlight,
      });
      if (invalidatedDuringFlight) {
        // The response predates the invalidation; fetch again so the entry
        // converges on post-invalidation data
        void this.fetch(key, fetcher, { force: true }).catch(() => {});
      }
      return data;
    })();
    promiseRef.current = promise;

    this.inflight.set(key, promise);
    return promise;
  }

  /**
   * Marks entries stale and notifies subscribers, which triggers refetches in
   * mounted hooks. No argument invalidates everything; a string invalidates
   * every key equal to it or starting with it. An invalidation that lands
   * while a request is in flight is not lost: the in-flight result is marked
   * stale when it arrives and a follow-up fetch runs automatically.
   */
  invalidate(keyOrPrefix?: string): void {
    for (const [key, state] of this.states) {
      if (keyOrPrefix !== undefined && !key.startsWith(keyOrPrefix)) {
        continue;
      }
      this.bumpEpoch(key);
      if (!state.isInvalidated) {
        this.setState(key, { ...state, isInvalidated: true });
      }
    }
  }

  /**
   * Drops entries' data immediately (e.g. on logout) and disowns any
   * in-flight requests so their results are discarded when they land.
   * Entries reset to an idle-but-invalidated snapshot, so mounted
   * subscribers refetch rather than stranding on an empty entry. Same key
   * matching as invalidate().
   */
  remove(keyOrPrefix?: string): void {
    for (const key of [...this.states.keys()]) {
      if (keyOrPrefix !== undefined && !key.startsWith(keyOrPrefix)) {
        continue;
      }
      this.bumpEpoch(key);
      this.inflight.delete(key);
      this.setState(key, REMOVED_STATE);
    }
  }

  private epochOf(key: string): number {
    return this.epochs.get(key) ?? 0;
  }

  private bumpEpoch(key: string): void {
    this.epochs.set(key, this.epochOf(key) + 1);
  }

  private setState(key: string, state: QueryState): void {
    this.states.set(key, state);
    this.notify(key);
  }

  private notify(key: string): void {
    const keyListeners = this.listeners.get(key);
    if (keyListeners !== undefined) {
      for (const listener of [...keyListeners]) {
        listener();
      }
    }
  }
}
