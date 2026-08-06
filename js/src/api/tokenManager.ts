const SCHEMATIC_API_KEY_HEADER = "X-Schematic-Api-Key";
const DEFAULT_REFRESH_BUFFER_MS = 60_000;
const DEFAULT_FALLBACK_TTL_MS = 15 * 60_000;

/**
 * What an access-token provider resolves to: a bare token string, or the
 * token with its expiry — forward `expired_at` from the token mint response
 * to enable exact proactive-refresh timing.
 */
export type AccessTokenResult =
  | string
  | {
      token: string;
      expiresAt?: string | Date;
    };

/**
 * Callback that returns a temporary access token (token_...), minted by your
 * backend via POST /temporary-access-tokens.
 */
export type AccessTokenProvider = () => Promise<AccessTokenResult>;

/**
 * A temporary access token, provided either as a static string (the consumer
 * owns refresh) or as an async provider the SDK can re-invoke to mint a fresh
 * token via the consumer's backend.
 */
export type AccessTokenInput = string | AccessTokenProvider;

export type TokenManagerOptions = {
  /** How long before a known expiry a token is considered stale (default 60s) */
  refreshBufferMs?: number;
  /**
   * Assumed token lifetime when the provider does not report an expiry
   * (default 15min, matching the API's temporary-token TTL), so proactive
   * refresh still happens instead of waiting for a 401.
   */
  fallbackTtlMs?: number;
};

/**
 * Minimal structural subset of the generated openapi runtime's Middleware,
 * so this module stays decoupled from any one generated client.
 */
export interface TokenResponseContext {
  fetch: (url: string, init: RequestInit) => Promise<Response>;
  url: string;
  init: RequestInit;
  response: Response;
}

export interface TokenMiddleware {
  post?(context: TokenResponseContext): Promise<Response | void>;
}

type CachedToken = {
  token: string;
  expiresAtMs?: number;
};

const toEpochMs = (
  expiresAt: string | Date | undefined,
): number | undefined => {
  if (expiresAt === undefined) {
    return undefined;
  }
  const ms =
    expiresAt instanceof Date ? expiresAt.getTime() : Date.parse(expiresAt);
  return Number.isNaN(ms) ? undefined : ms;
};

const readApiKeyHeader = (
  headers: RequestInit["headers"],
): string | undefined => {
  const normalized = normalizeHeaders(headers);
  for (const key of Object.keys(normalized)) {
    if (key.toLowerCase() === SCHEMATIC_API_KEY_HEADER.toLowerCase()) {
      return normalized[key];
    }
  }
  return undefined;
};

const normalizeHeaders = (
  headers: RequestInit["headers"],
): Record<string, string> => {
  if (headers === undefined) {
    return {};
  }
  if (headers instanceof Headers) {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }
  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }
  return { ...headers };
};

/**
 * Owns the lifecycle of a temporary access token: lazy resolution through the
 * consumer-supplied resolver, single-flight refresh, proactive refresh ahead
 * of a known expiry, and a retry-once-on-401 fetch middleware.
 *
 * Instances are immutable with respect to their input; to switch tokens (e.g.
 * on a company change), construct a new TokenManager.
 */
export class TokenManager {
  private readonly input: AccessTokenInput;
  private readonly refreshBufferMs: number;
  private readonly fallbackTtlMs: number;
  private cached: CachedToken | null = null;
  private pending: Promise<string> | null = null;
  /** Tokens minted as 401 retries that have not yet authenticated successfully */
  private retryTokens = new Set<string>();

  constructor(input: AccessTokenInput, options: TokenManagerOptions = {}) {
    this.input = input;
    this.refreshBufferMs = options.refreshBufferMs ?? DEFAULT_REFRESH_BUFFER_MS;
    this.fallbackTtlMs = options.fallbackTtlMs ?? DEFAULT_FALLBACK_TTL_MS;
  }

  /** True when constructed with a static token string; refresh is then the consumer's job */
  get isStatic(): boolean {
    return typeof this.input === "string";
  }

  /**
   * Returns a valid token, resolving through the consumer callback if there is
   * no cached token or the cached one is within the refresh buffer of expiry.
   * Concurrent callers share a single in-flight resolution.
   */
  getToken(): Promise<string> {
    if (typeof this.input === "string") {
      return Promise.resolve(this.input);
    }
    if (this.cached !== null && !this.isExpiring(this.cached)) {
      return Promise.resolve(this.cached.token);
    }
    if (this.pending !== null) {
      return this.pending;
    }
    const resolver = this.input;
    this.pending = (async () => {
      try {
        const resolved = await resolver();
        const { token, expiresAt } =
          typeof resolved === "string"
            ? { token: resolved, expiresAt: undefined }
            : resolved;
        if (token === "") {
          throw new Error("Schematic: getAccessToken returned an empty token");
        }
        const cached: CachedToken = {
          token,
          // Without a reported expiry, assume the API's 15-minute TTL so
          // proactive refresh still happens instead of waiting for a 401
          expiresAtMs: toEpochMs(expiresAt) ?? Date.now() + this.fallbackTtlMs,
        };
        this.cached = cached;
        return cached.token;
      } finally {
        this.pending = null;
      }
    })();
    return this.pending;
  }

  /** Drops the cached token; the next getToken() re-invokes the resolver */
  invalidate(): void {
    this.cached = null;
  }

  /** Suitable for the generated runtime's `Configuration.apiKey` */
  apiKey = (): Promise<string> => this.getToken();

  /**
   * Fetch middleware that, on a 401 with a resolver-backed token, refreshes
   * the token and replays the request. Retry bookkeeping is keyed on the
   * token value carried in the failing request's header (not on request
   * object identity), so it holds even when other middleware rebuilds the
   * request: a token minted as a 401 retry is never retried again unless it
   * has since authenticated a request successfully (i.e. a later 401 means
   * expiry, not a persistent rejection).
   */
  middleware(): TokenMiddleware {
    return {
      post: async (context: TokenResponseContext): Promise<Response | void> => {
        if (this.isStatic) {
          return;
        }
        const requestToken = readApiKeyHeader(context.init.headers);
        if (context.response.status !== 401) {
          if (requestToken !== undefined && context.response.status < 400) {
            // The token authenticated successfully; if it starts failing
            // later (expiry), it deserves a fresh retry
            this.retryTokens.delete(requestToken);
          }
          return;
        }
        if (requestToken === undefined || this.retryTokens.has(requestToken)) {
          // No token to reason about, or this token was itself minted as a
          // retry and has never succeeded: surface the 401
          return;
        }
        // Skip the invalidation if another request already refreshed the
        // cache past the failing token; just reuse the newer token
        if (this.cached === null || this.cached.token === requestToken) {
          this.invalidate();
        }
        let token: string;
        try {
          token = await this.getToken();
        } catch {
          // Refresh failed; surface the original 401
          return;
        }
        this.retryTokens.add(token);
        this.pruneRetryTokens();
        const headers = normalizeHeaders(context.init.headers);
        // Headers instances lowercase their keys; drop any existing match so
        // the stale credential is not merged with the fresh one
        for (const key of Object.keys(headers)) {
          if (key.toLowerCase() === SCHEMATIC_API_KEY_HEADER.toLowerCase()) {
            delete headers[key];
          }
        }
        headers[SCHEMATIC_API_KEY_HEADER] = token;
        const retryInit: RequestInit = { ...context.init, headers };
        return context.fetch(context.url, retryInit);
      },
    };
  }

  private pruneRetryTokens(): void {
    while (this.retryTokens.size > 32) {
      const oldest = this.retryTokens.values().next().value;
      if (oldest === undefined) {
        return;
      }
      this.retryTokens.delete(oldest);
    }
  }

  private isExpiring(cached: CachedToken): boolean {
    if (cached.expiresAtMs === undefined) {
      return false;
    }
    return Date.now() >= cached.expiresAtMs - this.refreshBufferMs;
  }
}
