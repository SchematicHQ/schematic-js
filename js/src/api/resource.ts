/**
 * Resource<T> is a minimal external store for one async value, designed to be
 * consumed through React's useSyncExternalStore (or any subscriber). Multiple
 * subscribers share a single in-flight fetch, and getSnapshot() always returns
 * the same object reference between state transitions (a useSyncExternalStore
 * requirement).
 */

export type ResourceState<T> = Readonly<{
  data: T | undefined;
  error: Error | undefined;
  /** A fetch is in flight and there is no data yet. */
  isPending: boolean;
  /** A fetch is in flight but previous data is still available. */
  isRefetching: boolean;
}>;

const IDLE_STATE: ResourceState<never> = Object.freeze({
  data: undefined,
  error: undefined,
  isPending: false,
  isRefetching: false,
});

type ResourceStatus = "idle" | "fetching" | "success" | "error";

/** How long a successful result is served without revalidating. */
const DEFAULT_STALE_TIME_MS = 30_000;

export interface ResourceOptions {
  /**
   * Milliseconds a successful result stays fresh. Once older than this, the
   * next ensure() (i.e. a hook mounting) revalidates in the background so data
   * changed out-of-band — a plan upgrade in another tab, the Stripe portal —
   * is picked up. 0 revalidates on every mount.
   */
  staleTime?: number;
  /** Injectable clock for tests. */
  now?: () => number;
}

export class Resource<T> {
  private state: ResourceState<T> = IDLE_STATE;
  private status: ResourceStatus = "idle";
  private listeners = new Set<() => void>();
  private inFlight: Promise<void> | undefined;
  /**
   * Incremented whenever an in-flight fetch is superseded (invalidate/reset),
   * so its late response is discarded instead of overwriting newer state.
   */
  private generation = 0;
  private stale = false;
  private fetchedAt = 0;
  private readonly staleTime: number;
  private readonly now: () => number;

  constructor(
    private readonly fetcher: () => Promise<T>,
    options: ResourceOptions = {},
  ) {
    this.staleTime = options.staleTime ?? DEFAULT_STALE_TIME_MS;
    this.now = options.now ?? (() => Date.now());
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): ResourceState<T> => {
    return this.state;
  };

  /**
   * Fetch if we have nothing usable: never fetched, previously errored,
   * explicitly invalidated, or the cached result has aged past staleTime.
   * Called by hooks on mount, so it must be cheap and idempotent.
   */
  ensure = (): void => {
    // Keyed off the in-flight request rather than `status`: a superseded fetch
    // leaves status at "fetching" with nothing actually running.
    if (this.inFlight !== undefined) {
      return;
    }
    if (
      this.status === "idle" ||
      this.status === "error" ||
      this.stale ||
      this.now() - this.fetchedAt >= this.staleTime
    ) {
      void this.fetch();
    }
  };

  /** Force a fetch; joins the in-flight one if a fetch is already running. */
  refetch = (): Promise<void> => {
    return this.fetch();
  };

  /**
   * Mark the resource stale and get fresh data. Any in-flight fetch is
   * superseded rather than joined — it was issued before whatever change
   * prompted the invalidation, so its response is already out of date.
   */
  invalidate = (): void => {
    this.stale = true;
    if (this.inFlight !== undefined) {
      this.generation += 1;
      this.inFlight = undefined;
    }
    if (this.listeners.size > 0) {
      void this.fetch();
    }
  };

  /**
   * Drop everything — data, error, freshness — and disown any in-flight fetch
   * so its result is discarded when it lands. For credential swaps (logout,
   * active-company change): data fetched under the old credential must not
   * survive, even briefly. Subscribed consumers refetch immediately (under
   * whatever credential the fetcher now resolves); otherwise the resource
   * returns to idle and the next ensure() fetches. Pass `refetch: false` when
   * no credential remains and a refetch could only fail (e.g. logout).
   */
  reset = (options: { refetch?: boolean } = {}): void => {
    this.generation += 1;
    this.inFlight = undefined;
    this.status = "idle";
    this.stale = false;
    this.fetchedAt = 0;
    this.setState(IDLE_STATE);
    if ((options.refetch ?? true) && this.listeners.size > 0) {
      void this.fetch();
    }
  };

  private fetch(): Promise<void> {
    if (this.inFlight !== undefined) {
      return this.inFlight;
    }
    const generation = ++this.generation;
    this.status = "fetching";
    this.stale = false;
    this.setState({
      data: this.state.data,
      error: undefined,
      isPending: this.state.data === undefined,
      isRefetching: this.state.data !== undefined,
    });
    const promise = this.fetcher()
      .then((data) => {
        if (generation !== this.generation) {
          return; // superseded by invalidate()/reset(); discard this response
        }
        this.status = "success";
        this.fetchedAt = this.now();
        this.setState({
          data,
          error: undefined,
          isPending: false,
          isRefetching: false,
        });
      })
      .catch((cause: unknown) => {
        if (generation !== this.generation) {
          return;
        }
        this.status = "error";
        const error = cause instanceof Error ? cause : new Error(String(cause));
        // Keep the previous data so the UI can show stale content next to the
        // error. Status stays "error" so the next ensure() retries.
        this.setState({
          data: this.state.data,
          error,
          isPending: false,
          isRefetching: false,
        });
      })
      .finally(() => {
        if (generation === this.generation) {
          this.inFlight = undefined;
        }
      });
    this.inFlight = promise;
    return promise;
  }

  private setState(state: ResourceState<T>): void {
    this.state = Object.freeze(state);
    for (const listener of this.listeners) {
      listener();
    }
  }
}
