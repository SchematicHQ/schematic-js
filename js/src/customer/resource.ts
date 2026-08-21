/**
 * Resource<T>: a minimal external store for one fetched value, shaped for
 * React's useSyncExternalStore but framework-agnostic. Snapshots are frozen
 * and referentially stable between state changes; fetches are single-flight
 * with a generation counter so an invalidate/refetch supersedes any
 * airborne request rather than racing it.
 */

export interface ResourceState<T> {
  data: T | undefined;
  error: Error | undefined;
  /** True until the first fetch settles. */
  isPending: boolean;
  /** True while re-fetching after data has already been loaded. */
  isRefetching: boolean;
}

export type ResourceFetcher<T> = () => Promise<T>;

export interface ResourceOptions<T = unknown> {
  /**
   * A value to start from (server-prefetched data): the resource begins
   * settled and fresh, so the first render is complete and the first
   * ensure() within staleTimeMs is a no-op. Errors are never held as fresh:
   * a failed fetch is retried by the next ensure().
   */
  initial?: T;
  /** How long a settled result stays fresh; ensure() refetches after. */
  staleTimeMs?: number;
}

const DEFAULT_STALE_TIME_MS = 30_000;

const startFetch = <T>(fetcher: ResourceFetcher<T>): Promise<T> => {
  try {
    return fetcher();
  } catch (err) {
    return Promise.reject(err instanceof Error ? err : new Error(String(err)));
  }
};

export class Resource<T> {
  private _fetcher: ResourceFetcher<T>;
  private readonly _staleTimeMs: number;
  private _state: ResourceState<T>;
  private _settledAt?: number;
  private _generation = 0;
  private _inflight?: Promise<void>;
  private readonly _listeners = new Set<() => void>();

  constructor(fetcher: ResourceFetcher<T>, options?: ResourceOptions<T>) {
    this._fetcher = fetcher;
    this._staleTimeMs = options?.staleTimeMs ?? DEFAULT_STALE_TIME_MS;
    const seeded = options?.initial !== undefined;
    if (seeded) {
      this._settledAt = Date.now();
    }
    this._state = Object.freeze({
      data: options?.initial,
      error: undefined,
      isPending: !seeded,
      isRefetching: false,
    });
  }

  /**
   * Resolves the value, fetching if nothing fresh is held — the one-shot
   * form for server prefetch and scripts. Rejects with the fetch error.
   */
  async load(): Promise<T> {
    await this.ensure();
    const { data, error } = this._state;
    if (error !== undefined) {
      throw error;
    }
    if (data === undefined) {
      throw new Error("resource settled without data");
    }
    return data;
  }

  subscribe = (listener: () => void): (() => void) => {
    this._listeners.add(listener);
    return () => {
      this._listeners.delete(listener);
    };
  };

  getSnapshot = (): ResourceState<T> => {
    return this._state;
  };

  /**
   * Starts a fetch if nothing has been fetched yet or the held value has
   * gone stale; otherwise a no-op. Safe to call from render effects.
   */
  ensure(): Promise<void> {
    if (this._inflight !== undefined) {
      return this._inflight;
    }
    if (
      this._settledAt !== undefined &&
      Date.now() - this._settledAt < this._staleTimeMs
    ) {
      return Promise.resolve();
    }
    return this._start(this._state.data !== undefined);
  }

  /** Unconditionally fetches, superseding any airborne request. */
  refetch(): Promise<void> {
    this._generation += 1;
    this._inflight = undefined;
    return this._start(this._state.data !== undefined);
  }

  /**
   * Marks the value stale. Refetches immediately only when someone is
   * subscribed; an unwatched resource waits for its next ensure(), so bulk
   * invalidation doesn't fire requests for data nobody is displaying.
   */
  invalidate(): Promise<void> {
    this._settledAt = undefined;
    if (this._listeners.size === 0) {
      this._generation += 1;
      this._inflight = undefined;
      return Promise.resolve();
    }
    return this.refetch();
  }

  /**
   * Clears all state back to idle. A subscribed resource immediately
   * starts a fresh fetch — a reset means the old value is meaningless
   * (e.g. a credential change), so anyone watching must not be left on a
   * permanent spinner; an unwatched resource waits for its next ensure().
   */
  reset(): void {
    this._generation += 1;
    this._inflight = undefined;
    this._settledAt = undefined;
    this._setState({
      data: undefined,
      error: undefined,
      isPending: true,
      isRefetching: false,
    });
    if (this._listeners.size > 0) {
      void this._start(false);
    }
  }

  /** Swaps the fetcher (e.g. after a credential change) and resets. */
  setFetcher(fetcher: ResourceFetcher<T>): void {
    this._fetcher = fetcher;
    this.reset();
  }

  private _start(isRefetching: boolean): Promise<void> {
    const generation = this._generation;
    // The in-flight promise is recorded BEFORE listeners hear about the
    // state change, so a listener that calls ensure() synchronously joins
    // this request instead of starting a duplicate.
    const run = (async () => {
      try {
        // A fetcher that throws synchronously is turned into a rejection so
        // it settles like any other failure — after the in-flight promise
        // and pending state are recorded — instead of wedging the store.
        const data = await startFetch(this._fetcher);
        if (generation !== this._generation) {
          return;
        }
        this._settledAt = Date.now();
        this._setState({
          data,
          error: undefined,
          isPending: false,
          isRefetching: false,
        });
      } catch (err) {
        if (generation !== this._generation) {
          return;
        }
        // A failure is not a fresh value: the next ensure() (a remount, a
        // retry button) tries again instead of serving the error for
        // staleTimeMs.
        this._settledAt = undefined;
        this._setState({
          ...this._state,
          error: err instanceof Error ? err : new Error(String(err)),
          isPending: false,
          isRefetching: false,
        });
      } finally {
        if (generation === this._generation) {
          this._inflight = undefined;
        }
      }
    })();
    this._inflight = run;
    this._setState({
      ...this._state,
      error: undefined,
      isPending: this._state.data === undefined,
      isRefetching,
    });
    return run;
  }

  private _setState(state: ResourceState<T>): void {
    this._state = Object.freeze(state);
    for (const listener of this._listeners) {
      listener();
    }
  }
}
