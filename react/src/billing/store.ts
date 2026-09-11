import type { ResourceState } from "./contract";

/**
 * Whether a resource can load: `ready` fetches, `waiting` holds its pending
 * state for something that has not arrived yet, and `never` settles empty.
 */
export type Readiness = "ready" | "waiting" | "never";

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
    private readonly _readiness: () => Readiness = () => "ready",
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

  get subscriberCount(): number {
    return this._listeners.size;
  }

  getSnapshot = (): ResourceState<T> => this._snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this._listeners.add(listener);
    // A failure is not a reason to try again on its own: a second
    // subscriber on the same query, or one remounting, would re-issue a
    // request that already failed. `refetch` is the way back.
    if (
      !this._loaded &&
      this._inflight === undefined &&
      this._snapshot.error === undefined
    ) {
      void this.load();
    }
    return () => {
      this._listeners.delete(listener);
    };
  };

  load(): Promise<void> {
    if (this._inflight !== undefined) {
      return this._inflight;
    }
    const readiness = this._readiness();
    if (readiness !== "ready") {
      // A resource constructed pending, or reset into it, would otherwise
      // stay pending for a load that is not coming.
      if (readiness === "never" && this._snapshot.isPending) {
        this._set({ ...this._snapshot, isPending: false });
      }

      return Promise.resolve();
    }
    const generation = ++this._generation;
    // Cleared when the load starts, not when it lands, so a retry reads as
    // pending from the moment it is asked for rather than only when it
    // returns.
    this._set({ ...this._snapshot, error: undefined, isPending: true });
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

  /** Reloads; `data` holds its current value until the response lands. */
  refetch(): Promise<void> {
    return this.load();
  }

  /**
   * Pages: `fetcher` receives the current data and returns what replaces it.
   * Never rejects — a caller that wants the failure reads `snapshot.error`,
   * and `data` keeps what was already fetched.
   *
   * A load already in flight wins: it is about to refresh the window this
   * would have appended to.
   */
  extend(fetcher: (data: T) => Promise<T>): Promise<void> {
    const current = this._snapshot.data;
    if (current === undefined) {
      return Promise.resolve();
    }
    if (this._readiness() !== "ready") {
      return Promise.resolve();
    }
    if (this._extending !== undefined) {
      return this._extending;
    }
    if (this._inflight !== undefined) {
      return this._inflight;
    }
    const generation = ++this._generation;
    this._set({ ...this._snapshot, error: undefined, isPending: true });
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

  seed(data: T): void {
    this._generation++;
    this._inflight = undefined;
    this._extending = undefined;
    this._loaded = true;
    this._set({ data, error: undefined, isPending: false });
  }

  update(fn: (data: T) => T): void {
    if (this._snapshot.data === undefined) return;
    // A request landing afterwards would merge into the data this replaced.
    this._generation++;
    this._inflight = undefined;
    this._extending = undefined;
    this._set({ ...this._snapshot, data: fn(this._snapshot.data) });
  }

  /**
   * Forgets everything and stays empty — no data, no error, not pending.
   * What a resource holds when there is no session to hold it for: a session
   * ending is not a failure and must not surface as one.
   */
  clear(): void {
    this._generation++;
    this._inflight = undefined;
    this._extending = undefined;
    this._loaded = false;
    this._set({ data: undefined, error: undefined, isPending: false });
  }

  /** Forgets everything; reloads immediately if anyone is subscribed. */
  reset(): void {
    this._generation++;
    this._inflight = undefined;
    this._extending = undefined;
    this._loaded = false;
    // Only a resource with nothing coming settles empty; where a load is
    // still possible, pending is the honest state.
    const readiness = this._readiness();
    const willLoad = this._listeners.size > 0 && readiness === "ready";
    this._set({
      data: undefined,
      error: undefined,
      isPending: willLoad || readiness === "waiting",
    });
    if (willLoad) {
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
 * Keys sorted and `undefined` dropped, so `{ b: 1, a: undefined }` and
 * `{ b: 1 }` hash the same.
 */
export function hashKey(params: unknown): string {
  return JSON.stringify(canonical(params));
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonical);
  }
  // Before the object branch: a Date has no own enumerable keys, so it would
  // canonicalize to `{}` there and every date would key the same resource.
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isNaN(time) ? "Invalid Date" : value.toISOString();
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
  /** Idle entries kept before the least recently used are dropped;
   * subscribed entries are never evicted. `Infinity` disables eviction. */
  maxIdle: number;
}

export interface KeyedResourceOptions<P> {
  hash?: (params: P) => string;
  eviction?: Partial<EvictionPolicy>;
  readiness?: () => Readiness;
}

/**
 * A resource is idle from creation until its subscription effect runs, which
 * is after the whole render pass — so `maxIdle` has to exceed the number of
 * distinct parameter sets one pass can read, or the first component's entry
 * is evicted by a later sibling's read and re-created (and refetched) when
 * its effect finally arrives. Four is comfortable for a query of one
 * boolean; a keyed resource with a richer query wants this raised, or
 * eviction moved to the moment a subscription ends.
 */
export const DEFAULT_EVICTION: EvictionPolicy = { maxIdle: 4 };

/**
 * A family of `Resource`s addressed by parameters. Each distinct parameter
 * set is its own row set with its own paging; there is no merging across
 * keys.
 */
export class KeyedResource<T, P> {
  private readonly _entries = new Map<
    string,
    { params: P; resource: Resource<T> }
  >();
  private readonly _hash: (params: P) => string;
  private readonly _eviction: EvictionPolicy;
  private readonly _readiness: () => Readiness;

  constructor(
    private readonly _fetcher: (
      params: P,
      current: T | undefined,
    ) => Promise<T>,
    options: KeyedResourceOptions<P> = {},
  ) {
    this._readiness = options.readiness ?? (() => "ready");
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

  entries(): Array<{ key: string; params: P; resource: Resource<T> }> {
    return Array.from(this._entries, ([key, e]) => ({ key, ...e }));
  }

  get(params: P): Resource<T> {
    const key = this._hash(params);
    const existing = this._entries.get(key);
    if (existing !== undefined) {
      // Re-insert to move it to most-recently-used.
      this._entries.delete(key);
      this._entries.set(key, existing);
      return existing.resource;
    }
    const resource: Resource<T> = new Resource<T>(
      () => this._fetcher(params, resource.snapshot.data),
      undefined,
      this._readiness,
    );
    this._entries.set(key, { params, resource });
    this._evict(key);
    return resource;
  }

  has(params: P): boolean {
    return this._entries.has(this._hash(params));
  }

  subscribe(params: P, listener: () => void): () => void {
    const resource = this.get(params);
    const unsubscribe = resource.subscribe(listener);
    return () => {
      unsubscribe();
      this._evict();
    };
  }

  seed(params: P, data: T): void {
    this.get(params).seed(data);
  }

  evict(params: P): boolean {
    return this._entries.delete(this._hash(params));
  }

  resetAll(): void {
    for (const [key, { resource }] of Array.from(this._entries)) {
      if (resource.subscriberCount === 0) {
        this._entries.delete(key);
      } else {
        resource.reset();
      }
    }
  }

  resumeAll(): void {
    for (const { resource } of this._entries.values()) {
      if (resource.subscriberCount === 0) {
        continue;
      }
      const { data, error } = resource.snapshot;
      if (data === undefined || error !== undefined) {
        void resource.load();
      }
    }
  }

  clearAll(): void {
    for (const [key, { resource }] of Array.from(this._entries)) {
      if (resource.subscriberCount === 0) {
        this._entries.delete(key);
      } else {
        resource.clear();
      }
    }
  }

  invalidateAll(): void {
    for (const { resource } of this._entries.values()) {
      if (resource.snapshot.data !== undefined) {
        void resource.refetch();
      }
    }
  }

  /**
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
