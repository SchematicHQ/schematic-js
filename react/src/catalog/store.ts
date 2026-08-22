import type { ResourceState } from "./contract";

/**
 * A single server resource as an external store: subscribe / snapshot for
 * `useSyncExternalStore`, plus load / refetch / reset. Framework-agnostic so
 * it can move to schematic-js and serve other frameworks.
 *
 * Semantics:
 * - The first subscriber triggers a load when nothing has been loaded yet.
 * - In-flight loads are deduplicated; `refetch` while loading is a no-op.
 * - A failed refetch keeps the last good data and records the error.
 * - `reset` clears everything and reloads when subscribed.
 * - `seed` installs data without a request (server prefetch / fixtures).
 */
export class Resource<T> {
  private _snapshot: ResourceState<T>;
  private _listeners = new Set<() => void>();
  private _inflight: Promise<void> | undefined;
  private _generation = 0;
  private _loaded = false;

  constructor(
    private readonly _fetcher: () => Promise<T>,
    initial?: T,
  ) {
    this._loaded = initial !== undefined;
    this._snapshot = {
      data: initial,
      error: undefined,
      isPending: initial === undefined,
    };
  }

  get snapshot(): ResourceState<T> {
    return this._snapshot;
  }

  getSnapshot = (): ResourceState<T> => this._snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this._listeners.add(listener);
    if (!this._loaded && this._inflight === undefined) {
      void this.load();
    }
    return () => {
      this._listeners.delete(listener);
    };
  };

  /** Loads once; later calls while loading share the request. */
  load(): Promise<void> {
    if (this._inflight !== undefined) {
      return this._inflight;
    }
    const generation = ++this._generation;
    this._set({ ...this._snapshot, isPending: true });
    const run = Promise.resolve()
      .then(() => this._fetcher())
      .then(
        (data) => {
          if (generation !== this._generation) return;
          this._loaded = true;
          this._set({ data, error: undefined, isPending: false });
        },
        (cause: unknown) => {
          if (generation !== this._generation) return;
          const error =
            cause instanceof Error ? cause : new Error(String(cause));
          this._set({ ...this._snapshot, error, isPending: false });
        },
      )
      .finally(() => {
        if (generation === this._generation) {
          this._inflight = undefined;
        }
      });
    this._inflight = run;
    return run;
  }

  /** Reloads, keeping the current data on screen until the response lands. */
  refetch(): Promise<void> {
    return this.load();
  }

  /** Replaces the data without a request and marks the resource loaded. */
  seed(data: T): void {
    this._generation++;
    this._inflight = undefined;
    this._loaded = true;
    this._set({ data, error: undefined, isPending: false });
  }

  /**
   * Updates loaded data in place (e.g. appending a page); a no-op until the
   * resource has data.
   */
  update(fn: (data: T) => T): void {
    if (this._snapshot.data === undefined) return;
    this._set({ ...this._snapshot, data: fn(this._snapshot.data) });
  }

  /** Forgets everything; reloads immediately if anyone is subscribed. */
  reset(): void {
    this._generation++;
    this._inflight = undefined;
    this._loaded = false;
    this._set({ data: undefined, error: undefined, isPending: true });
    if (this._listeners.size > 0) {
      void this.load();
    }
  }

  private _set(next: ResourceState<T>): void {
    this._snapshot = next;
    for (const listener of this._listeners) {
      listener();
    }
  }
}
