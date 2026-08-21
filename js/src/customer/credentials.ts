/**
 * Temporary-access-token credential management for the customer client.
 *
 * Tokens are issued by the host application's backend (which holds a secret
 * key) and expire, so the client accepts either a static token string or an
 * async provider it can call to fetch a fresh token. Refreshes are
 * single-flight: concurrent requests share one in-flight provider call.
 */

export interface AccessTokenResult {
  token: string;
  /** When the token expires; defaults to a conservative TTL when omitted. */
  expiresAt?: Date;
}

export type AccessTokenProvider = () => Promise<string | AccessTokenResult>;

export type AccessTokenInput = string | AccessTokenProvider;

/** Refresh this long before the known expiry rather than at it. */
const DEFAULT_REFRESH_BUFFER_MS = 60_000;

/** Assumed lifetime when the provider doesn't report an expiry. */
const DEFAULT_FALLBACK_TTL_MS = 15 * 60_000;

export interface AccessTokenManagerOptions {
  refreshBufferMs?: number;
  fallbackTtlMs?: number;
}

export class AccessTokenManager {
  private _source: AccessTokenInput;
  private _token?: string;
  private _expiresAt?: number;
  private _inflight?: Promise<string>;
  private readonly _refreshBufferMs: number;
  private readonly _fallbackTtlMs: number;

  constructor(source: AccessTokenInput, options?: AccessTokenManagerOptions) {
    this._source = source;
    this._refreshBufferMs =
      options?.refreshBufferMs ?? DEFAULT_REFRESH_BUFFER_MS;
    this._fallbackTtlMs = options?.fallbackTtlMs ?? DEFAULT_FALLBACK_TTL_MS;
    if (typeof source === "string") {
      this._token = source;
    }
  }

  /**
   * The token to send on the next request, refreshing through the provider
   * when none is held or the held one is within the refresh buffer of
   * expiring.
   */
  async getToken(): Promise<string> {
    if (typeof this._source === "string") {
      return this._source;
    }
    if (this._token !== undefined && !this._isExpiring()) {
      return this._token;
    }
    return this._refresh();
  }

  /**
   * Drops the held token so the next getToken() refreshes. Called after a
   * 401 so a single retry runs with a fresh token. Returns whether a
   * refresh is possible (static tokens can't be refreshed).
   */
  invalidate(invalidToken?: string): boolean {
    if (typeof this._source === "string") {
      return false;
    }
    // Ignore stale invalidations: if the failing request was sent with a
    // token we've since replaced, the current one may already be good.
    if (invalidToken !== undefined && invalidToken !== this._token) {
      return true;
    }
    this._token = undefined;
    this._expiresAt = undefined;
    return true;
  }

  /**
   * Replaces the credential source. The held token is discarded unless
   * preserveToken is set — used when swapping to a new provider function
   * for the SAME session (e.g. a React prop re-created per render), where
   * refetching the token would be pure churn.
   */
  setSource(
    source: AccessTokenInput,
    opts?: { preserveToken?: boolean },
  ): void {
    this._source = source;
    this._inflight = undefined;
    if (typeof source === "string") {
      this._token = source;
      this._expiresAt = undefined;
      return;
    }
    if (opts?.preserveToken !== true) {
      this._token = undefined;
      this._expiresAt = undefined;
    }
  }

  private _isExpiring(): boolean {
    if (this._expiresAt === undefined) {
      return false;
    }
    return Date.now() >= this._expiresAt - this._refreshBufferMs;
  }

  private _refresh(): Promise<string> {
    if (this._inflight !== undefined) {
      return this._inflight;
    }
    const source = this._source;
    if (typeof source === "string") {
      return Promise.resolve(source);
    }
    const inflight: Promise<string> = (async () => {
      const result = await source();
      // A source swap while the call was airborne wins over its result.
      if (this._source !== source) {
        return this.getToken();
      }
      if (typeof result === "string") {
        this._token = result;
        this._expiresAt = Date.now() + this._fallbackTtlMs;
      } else {
        this._token = result.token;
        this._expiresAt =
          result.expiresAt?.getTime() ?? Date.now() + this._fallbackTtlMs;
      }
      return this._token;
    })().finally(() => {
      if (this._inflight === inflight) {
        this._inflight = undefined;
      }
    });
    this._inflight = inflight;
    return inflight;
  }
}
