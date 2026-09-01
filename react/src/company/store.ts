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
 * - `extend` pages: same pending and error fields, data merged in place.
 * - `reset` clears everything and reloads when subscribed.
 * - `seed` installs data without a request (server prefetch / fixtures).
 */
export class Resource<T> {
  private _snapshot: ResourceState<T>;
  private _listeners = new Set<() => void>();
  private _inflight: Promise<void> | undefined;
  private _extending: Promise<void> | undefined;
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

  /** How many listeners are attached; zero means nothing is rendering it. */
  get subscriberCount(): number {
    return this._listeners.size;
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

  /**
   * Fetches more of the resource and merges it into the data on screen —
   * the paging case. `fetcher` receives the current data and returns what
   * replaces it, so the caller owns the merge.
   *
   * Pending and error are the same fields a load uses: an in-flight page
   * reads as pending, and a failed one records the error while the rows
   * already fetched stay on screen. Never rejects — a caller that wants the
   * failure reads `snapshot.error`.
   *
   * A no-op until the resource has data. Concurrent calls share the request,
   * and a load already in flight wins: it is about to refresh the window
   * this would have appended to.
   */
  extend(fetcher: (data: T) => Promise<T>): Promise<void> {
    const current = this._snapshot.data;
    if (current === undefined) {
      return Promise.resolve();
    }
    if (this._extending !== undefined) {
      return this._extending;
    }
    if (this._inflight !== undefined) {
      return this._inflight;
    }
    const generation = ++this._generation;
    this._set({ ...this._snapshot, isPending: true });
    const run = Promise.resolve()
      .then(() => fetcher(current))
      .then(
        (data) => {
          // A reset or seed while the page was in flight discards it.
          if (generation !== this._generation) return;
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
        if (this._extending === run) {
          this._extending = undefined;
        }
      });
    this._extending = run;
    return run;
  }

  /** Replaces the data without a request and marks the resource loaded. */
  seed(data: T): void {
    this._generation++;
    this._inflight = undefined;
    this._extending = undefined;
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
    this._extending = undefined;
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

/**
 * Serializes a parameter object to a stable key: keys sorted, `undefined`
 * dropped, so `{ b: 1, a: undefined }` and `{}` with `b: 1` hash the same.
 * Nested objects and arrays are handled; anything else goes through JSON.
 */
export function hashKey(params: unknown): string {
  return JSON.stringify(canonical(params));
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonical);
  }
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as object).sort()) {
      const v = (value as Record<string, unknown>)[key];
      if (v !== undefined) {
        out[key] = canonical(v);
      }
    }
    return out;
  }
  return value ?? null;
}

export interface EvictionPolicy {
  /**
   * How many entries with no subscribers to keep around. When more are idle,
   * the least recently used ones are dropped. Subscribed entries are never
   * evicted. Default 4; `Infinity` disables eviction.
   */
  maxIdle: number;
}

export interface KeyedResourceOptions<P> {
  /** Maps params to a cache key; defaults to `hashKey`. */
  hash?: (params: P) => string;
  eviction?: Partial<EvictionPolicy>;
}

export const DEFAULT_EVICTION: EvictionPolicy = { maxIdle: 4 };

/**
 * A family of `Resource`s addressed by parameters — a list resource whose
 * server-side filter, sort, or scope varies per consumer. Each distinct
 * parameter set is its own row set with its own paging, so it gets its own
 * `Resource`; there is no merging across keys.
 *
 * Entries are created on demand and evicted by policy: an entry with no
 * subscribers is idle, and only the `maxIdle` most recently used idle
 * entries survive. `resetAll` and `invalidateAll` fan out to every entry.
 */
export class KeyedResource<T, P> {
  private readonly _entries = new Map<
    string,
    { params: P; resource: Resource<T> }
  >();
  private readonly _hash: (params: P) => string;
  private readonly _eviction: EvictionPolicy;

  constructor(
    private readonly _fetcher: (
      params: P,
      current: T | undefined,
    ) => Promise<T>,
    options: KeyedResourceOptions<P> = {},
  ) {
    this._hash = options.hash ?? hashKey;
    this._eviction = {
      maxIdle: options.eviction?.maxIdle ?? DEFAULT_EVICTION.maxIdle,
    };
  }

  hash(params: P): string {
    return this._hash(params);
  }

  get size(): number {
    return this._entries.size;
  }

  /** Every live entry, least recently used first. */
  entries(): Array<{ key: string; params: P; resource: Resource<T> }> {
    return Array.from(this._entries, ([key, e]) => ({ key, ...e }));
  }

  /** The resource for these params, created (unloaded) if absent. */
  get(params: P): Resource<T> {
    const key = this._hash(params);
    const existing = this._entries.get(key);
    if (existing !== undefined) {
      // Re-insert to move it to most-recently-used.
      this._entries.delete(key);
      this._entries.set(key, existing);
      return existing.resource;
    }
    const resource: Resource<T> = new Resource<T>(() =>
      this._fetcher(params, resource.snapshot.data),
    );
    this._entries.set(key, { params, resource });
    this._evict(key);
    return resource;
  }

  /** Whether an entry exists for these params. */
  has(params: P): boolean {
    return this._entries.has(this._hash(params));
  }

  /** Subscribes to the entry for these params; eviction runs on unsubscribe. */
  subscribe(params: P, listener: () => void): () => void {
    const resource = this.get(params);
    const unsubscribe = resource.subscribe(listener);
    return () => {
      unsubscribe();
      this._evict();
    };
  }

  /** Installs data for these params without a request. */
  seed(params: P, data: T): void {
    this.get(params).seed(data);
  }

  /** Drops the entry for these params, subscribed or not. */
  evict(params: P): boolean {
    return this._entries.delete(this._hash(params));
  }

  /** Forgets every entry's data; subscribed entries reload, idle ones are dropped. */
  resetAll(): void {
    for (const [key, { resource }] of Array.from(this._entries)) {
      if (resource.subscriberCount === 0) {
        this._entries.delete(key);
      } else {
        resource.reset();
      }
    }
  }

  /** Reloads every entry that has data, keeping it on screen. */
  invalidateAll(): void {
    for (const { resource } of this._entries.values()) {
      if (resource.snapshot.data !== undefined) {
        void resource.refetch();
      }
    }
  }

  /**
   * Drops idle entries past the budget, oldest first.
   *
   * `keep` is the entry a caller is about to be handed. It has no subscribers
   * yet, so it counts against the budget like any other idle entry, but it is
   * never the one dropped — evicting it would return a `Resource` the family
   * no longer holds, and every later `get` for those params would hand back a
   * different one.
   */
  private _evict(keep?: string): void {
    const idle = Array.from(this._entries).filter(
      ([, e]) => e.resource.subscriberCount === 0,
    );
    let excess = idle.length - this._eviction.maxIdle;
    for (const [key] of idle) {
      if (excess <= 0) break;
      if (key === keep) {
        continue;
      }
      this._entries.delete(key);
      excess -= 1;
    }
  }
}
