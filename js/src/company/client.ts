import { GetCompanyInvoicesResponseFromJSON } from "./api/company/models";
import type {
  CompanyData,
  CompanyResourceName,
  Invoice,
  InvoiceQuery,
} from "./contract";

/**
 * An access token as a string, or an async provider the client calls (and
 * re-calls after a 401) that returns the token, optionally with its expiry.
 */
export type AccessTokenProvider = () => Promise<
  string | { token: string; expiresAt?: Date | string | null }
>;
export type AccessToken = string | AccessTokenProvider;

/** The client interface the React provider consumes (mirrored in schematic-react). */
export interface InvoicesRequest extends InvoiceQuery {
  limit: number;
  offset: number;
}

/**
 * One window of invoice history: the rows asked for, and how many the query
 * matches in total. The caller decides what that means for paging — the
 * client reports what the server said and nothing more.
 */
export interface InvoicesResult {
  invoices: Invoice[];
  count: number;
}

export interface CompanyClient {
  fetchInvoices(params: InvoicesRequest): Promise<InvoicesResult>;
  onCredentialsChange?(listener: () => void): () => void;
  /** Whether the host has said there is no session; see `setAccessToken`. */
  readonly sessionEnded?: boolean;
  /** States the session on a client whose token this host did not supply. */
  setSession?(session: string | null | undefined): void;
  /**
   * Installs the token, and optionally the host's name for the session it
   * belongs to. A changed `session` is taken at face value: the token in
   * hand is dropped and listeners are told, without waiting for a
   * resolution to prove the session differs.
   *
   * `session` has three states, and they are not the same: a string names
   * the session, `null` says there is none — signed out — and `undefined`
   * says the host does not know yet.
   */
  setAccessToken?(
    token: AccessToken | undefined,
    session?: string | null,
  ): void;
}

export interface CompanyClientOptions {
  /** Temporary access token (or provider): serves the `/company/*` reads. */
  accessToken?: AccessToken;
  apiUrl?: string;
  additionalHeaders?: Record<string, string>;
  /** Override for tests and non-browser runtimes. */
  fetch?: typeof fetch;
}

export class SchematicApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly path: string,
    public readonly body: unknown,
  ) {
    super(
      typeof body === "object" && body !== null && "error" in body
        ? String((body as { error: unknown }).error)
        : `Request to ${path} failed with status ${status}`,
    );
    this.name = "SchematicApiError";
  }
}

const DEFAULT_API_URL = "https://api.schematichq.com";

/**
 * Rows per invoices page. schematic-react's store pages on the same size by
 * re-exporting this rather than keeping a copy of the number.
 */
export const INVOICE_PAGE_SIZE = 12;

/**
 * The largest page the API will serve: `limit` above this is a 400 (see
 * PaginationFilter in schematic-api). A refetch re-requests every row loaded
 * so far, so it has to know where that stops.
 */
export const INVOICE_MAX_PAGE_SIZE = 250;

/** A token in hand, and what produced it: a string prop, or a provider. */
interface ResolvedToken {
  token: string;
  expiresAt?: Date;
  /** What this came from; a refresh by the same source is not a new session. */
  source: AccessToken;
}

/** An in-flight call to a token provider, and whether a 401 forced it. */
interface ResolvingToken {
  promise: Promise<string>;
  forced: boolean;
  /** Tells this resolution apart from one that replaces it in the slot. */
  generation: number;
}

/**
 * The company API client — today, the `/company/invoices` slice of
 * it; the catalog and remaining company reads ship with their elements.
 *
 * Token handling: a string token is used as-is; a provider is called once
 * and cached (single-flight) until it expires or a request returns 401, in
 * which case it is called again and the request retried once.
 *
 * The session is the token a provider *resolves to*, never the provider
 * itself: a host that writes `accessToken={async () => …}` inline hands over
 * a new function on every render, and none of those are a new session.
 * Listeners hear about a change when a token that came from somewhere else
 * differs from the one in hand — a refresh the client asked for itself is
 * never one, however much the value rotates, because a token endpoint that
 * mints a fresh string per call is still the same session.
 *
 * That leaves one case the client cannot see: a host that keeps handing over
 * the same provider — which is what `CompanyProvider` does, forwarding one
 * stable function for the life of the component — while the company behind
 * it changes. There is nothing in the token or the function to read, so
 * `session` on `setAccessToken` is the only signal, and the host has to give
 * it. Under React that means `sessionKey`; see `CompanyProviderProps`.
 */
export class SchematicCompanyClient implements CompanyClient {
  private readonly _apiUrl: string;
  private readonly _headers: Record<string, string>;
  private readonly _fetch: typeof fetch;
  private _accessToken: AccessToken | undefined;
  private _resolved: ResolvedToken | undefined;
  /** Whether `_resolved` may be served without asking the provider again. */
  private _cached = false;
  private _resolving: ResolvingToken | undefined;
  private _resolveGeneration = 0;
  /** The session the host last stated: a name, or `null` for none. */
  private _session: string | null | undefined;
  /** Whether the host has ever stated one; its first statement is not a change. */
  private _sessionSeen = false;
  private readonly _listeners = new Set<() => void>();

  constructor(options: CompanyClientOptions = {}) {
    this._accessToken = options.accessToken;
    if (typeof options.accessToken === "string") {
      this._resolved = {
        token: options.accessToken,
        source: options.accessToken,
      };
      this._cached = true;
    }
    this._apiUrl = (options.apiUrl ?? DEFAULT_API_URL).replace(/\/$/, "");
    this._headers = options.additionalHeaders ?? {};
    this._fetch =
      options.fetch ?? ((input, init) => globalThis.fetch(input, init));
  }

  /** Whether requests can carry a company token. */
  get hasAccessToken(): boolean {
    return this._accessToken !== undefined;
  }

  /**
   * Whether the host has said there is no session. Distinct from a failure:
   * there is nothing to show and nothing went wrong, so a store holding this
   * client's data empties rather than reporting an error at a reader who has
   * merely signed out.
   */
  get sessionEnded(): boolean {
    return this._session === null;
  }

  /**
   * Installs or clears the access token, and optionally names the session it
   * belongs to.
   *
   * Clearing the token ends the session, a different string is a different
   * one, and a changed `session` is the host stating one outright: all three
   * tell the listeners. A different provider function on its own is not —
   * its identity says nothing about which company is on the other end, and a
   * host rebuilding the closure each render would otherwise drop every
   * loaded resource on every render. There the cache is invalidated and the
   * next resolution decides, on where the token came from and what it says
   * (see `_adopt`).
   */
  setAccessToken(
    token: AccessToken | undefined,
    session?: string | null,
  ): void {
    // Three states, because two cannot carry this. A name is a session;
    // `null` is the host saying there is none, which is what sign-out looks
    // like and has to drop the rows of the company signed out of; and
    // `undefined` is the host not knowing yet — every async auth renders
    // once before it resolves, and reading that as a change would refetch
    // the page that just loaded. Only a stated session that differs from the
    // last stated one is a change, and an unknown one states nothing, so it
    // leaves what is known intact.
    const sessionChanged = this._stateSession(session);
    // A credential handed over where the last one ended revives the client
    // even with no session named: passing a token is a statement of its own,
    // and refusing to read for the life of the page is not what a host
    // signing back in with a fresh token means by it.
    const revived =
      session === undefined &&
      this._session === null &&
      token !== undefined &&
      token !== this._accessToken;
    if (revived) {
      this._session = undefined;
      this._sessionSeen = false;
    }
    if (token === this._accessToken && !sessionChanged) {
      return;
    }
    const hadNoCredential = this._accessToken === undefined;
    this._accessToken = token;
    // Anything already on the wire was asked for by the session being left,
    // so its answer is that session's token. Retiring the generation stops
    // it being adopted here after it lands.
    this._resolving = undefined;
    this._resolveGeneration += 1;

    if (token === undefined) {
      this._resolved = undefined;
      this._cached = false;
      this._notify();
      return;
    }
    if (sessionChanged) {
      // Take the host at its word: drop the token in hand, and keep a string
      // one as the session's own so a later change to it still registers.
      const isString = typeof token === "string";
      this._resolved = isString ? { token, source: token } : undefined;
      this._cached = isString;
      this._notify();
      return;
    }
    if (typeof token === "string") {
      this._cached = true;
      this._adopt({ token, source: token });
    } else {
      this._cached = false;
    }

    // A session that had ended has just been revived by this credential.
    // Nothing below reports that on its own — `_adopt` is silent where the
    // ended session left nothing to replace, and a provider function is
    // never adopted here at all — while the store that emptied at sign-out
    // is waiting to be told it can load again.
    if (revived) {
      this._notify();
      return;
    }

    // Replacing nothing is the app acquiring a credential it did not have.
    // A provider resolves nothing on its own to announce that, and a string
    // is adopted without replacing anything, so neither path above reports
    // it — leaving a resource that already failed for the lack of a token
    // sitting on that error for the life of the page.
    if (hadNoCredential) {
      this._notify();
    }
  }

  /**
   * States the session without touching the token — for a host that built
   * its own client, whose token this provider never supplied and must not
   * clear. Same three states, and a change drops what was loaded under the
   * session being left.
   */
  setSession(session: string | null | undefined): void {
    if (!this._stateSession(session)) {
      return;
    }
    // Anything on the wire was asked for by the session being left.
    this._resolving = undefined;
    this._resolveGeneration += 1;
    const inHand = this._accessToken;
    const isString = typeof inHand === "string";
    this._resolved = isString ? { token: inHand, source: inHand } : undefined;
    this._cached = isString;
    this._notify();
  }

  /**
   * Records what the host said about the session, and reports whether that
   * invalidates what is loaded.
   *
   * Three states, because two cannot carry this. A name is a session;
   * `null` is the host saying there is none, which is what sign-out looks
   * like and has to drop the rows of the company signed out of; and
   * `undefined` is the host not knowing yet — every async auth renders once
   * before it resolves, and reading that as a change would refetch the page
   * that just loaded, so it states nothing and leaves what is known intact.
   *
   * A first statement of a *name* is not a change: it names the session the
   * data on screen was prefetched or seeded for. A first statement of `null`
   * is one — nothing on screen can belong to a session the host says does
   * not exist, and an auth resolving to signed-out states exactly that
   * having stated nothing before it.
   */
  private _stateSession(session: string | null | undefined): boolean {
    if (session === undefined) {
      return false;
    }
    const changed =
      session !== this._session && (this._sessionSeen || session === null);
    this._session = session;
    this._sessionSeen = true;

    return changed;
  }

  onCredentialsChange(listener: () => void): () => void {
    this._listeners.add(listener);
    return () => {
      this._listeners.delete(listener);
    };
  }

  private _notify(): void {
    for (const listener of this._listeners) {
      listener();
    }
  }

  /**
   * Installs a freshly resolved token, and reports it when the credential in
   * hand has actually changed.
   *
   * A token endpoint hands back a new string on every call, so value alone
   * would make each expiry look like a new session and drop every loaded
   * resource — a source refreshing its own token is never a change, however
   * much the value rotates.
   *
   * A resolution that replaces nothing is not a change either: it is the
   * first answer from a credential the client already had, and the request
   * that asked for it is still in flight. Acquiring a credential where there
   * was none is a different thing, and `setAccessToken` reports that.
   */
  private _adopt(resolved: ResolvedToken): string {
    const previous = this._resolved;
    this._resolved = resolved;
    if (
      previous !== undefined &&
      previous.source !== resolved.source &&
      previous.token !== resolved.token
    ) {
      this._notify();
    }
    return resolved.token;
  }

  fetchInvoices(params: InvoicesRequest): Promise<InvoicesResult> {
    const query = new URLSearchParams({
      limit: String(Math.min(params.limit, INVOICE_MAX_PAGE_SIZE)),
      offset: String(params.offset),
    });
    if (params.includePending !== undefined) {
      query.set("include_pending", String(params.includePending));
    }
    const path = `/company/invoices?${query}`;
    return this._request(path).then((body) => {
      if (body === null || typeof body !== "object" || !("data" in body)) {
        throw new Error(`Malformed response from ${path}`);
      }
      // The API wraps the rows in a type that serializes an empty slice as
      // `[]` rather than Go's `null`, so the generated decoder never maps
      // over nothing. Answered anyway: the decoder would throw on a null
      // where this reports an empty history.
      const data = (body as { data: unknown }).data as {
        invoices?: unknown;
      } | null;
      // `== null` for both: a field the server left out arrives as undefined,
      // where `=== null` would fall through to the decoder and throw mapping
      // over nothing.
      if (data == null || data.invoices == null) {
        return { invoices: [], count: 0 };
      }
      const decoded = GetCompanyInvoicesResponseFromJSON(body).data;
      return { invoices: decoded.invoices, count: decoded.count };
    });
  }

  private async _credential(): Promise<string> {
    // A session the host has ended serves nothing, even though its token
    // prop is still in hand. Dropping the rows is not enough on its own:
    // resetting reloads whatever is subscribed, and at sign-out the host's
    // token endpoint can still mint a token for the company being left —
    // which would fetch its invoices straight back onto the screen.
    // Only a direct caller reaches this: a store holding this client reads
    // `sessionEnded` and empties instead, so an element shows a signed-out
    // reader nothing rather than an error meant for whoever wired the page.
    if (this._session === null) {
      throw new Error(
        "The session has ended. Name a new one to read company data.",
      );
    }
    if (this._accessToken === undefined) {
      throw new Error("An access token is required to read company data.");
    }
    return this._resolveToken(this._accessToken, false);
  }

  private _resolveToken(token: AccessToken, force: boolean): Promise<string> {
    if (typeof token === "string") {
      return Promise.resolve(token);
    }
    const cached = this._resolved;
    if (
      !force &&
      this._cached &&
      cached !== undefined &&
      (cached.expiresAt === undefined ||
        cached.expiresAt.getTime() > Date.now())
    ) {
      return Promise.resolve(cached.token);
    }

    // A forced resolution cannot settle for one that started before the
    // token went stale — that would hand back the token the API just
    // rejected. Concurrent forced calls still share a request.
    const inflight = this._resolving;
    if (inflight !== undefined && (!force || inflight.forced)) {
      return inflight.promise;
    }

    const provider = token;
    const generation = ++this._resolveGeneration;
    const promise = Promise.resolve()
      .then(() => provider())
      .then((result) => {
        const resolved = asResolvedToken(result, provider);
        // A token installed while this was on the wire wins, and so does a
        // resolution opened after this one — a forced refresh supersedes the
        // call that was still running when the API rejected its token.
        if (
          this._accessToken !== provider ||
          generation !== this._resolveGeneration
        ) {
          return resolved.token;
        }
        this._cached = true;
        return this._adopt(resolved);
      })
      .finally(() => {
        // Only the resolution that owns the slot may clear it; one swapped in
        // mid-flight has already claimed it.
        if (this._resolving?.generation === generation) {
          this._resolving = undefined;
        }
      });
    this._resolving = { promise, forced: force, generation };
    return promise;
  }

  private async _request(path: string): Promise<unknown> {
    const send = async (credential: string): Promise<Response> =>
      this._fetch(`${this._apiUrl}${path}`, {
        method: "GET",
        headers: {
          "Accept": "application/json",
          ...this._headers,
          "X-Schematic-Api-Key": credential,
        },
      });

    let response = await send(await this._credential());

    // A stale token from a provider: refresh once and retry. The provider is
    // read once, before the awaits below: a logout landing mid-flight would
    // otherwise leave `this._accessToken` undefined and the retry would call
    // it as a function. `_resolveToken` still declines to adopt a token whose
    // provider has since been replaced.
    const provider = this._accessToken;
    if (response.status === 401 && typeof provider === "function") {
      // Drain the rejected response so its connection is released rather
      // than held open for the life of the retry.
      await readBody(response);
      response = await send(await this._resolveToken(provider, true));
    }

    const body = await readBody(response);
    if (!response.ok) {
      throw new SchematicApiError(response.status, path, body);
    }
    return body;
  }
}

/**
 * Normalizes what a provider handed back.
 *
 * Hosts return a parsed response body — the documented example is
 * `(await fetch("/api/access-token")).json()` — so `expiresAt` arrives as
 * whatever JSON can carry, which is a string, and `.json()` is `any`, so the
 * declared `Date` catches nothing. Left as-is it is adopted happily and then
 * throws on the *next* request, where `expiresAt.getTime` is not a function.
 * An unreadable date is treated as no expiry, which the 401 refresh covers;
 * a missing token is not recoverable and says so rather than being sent as
 * the string "undefined".
 */
function asResolvedToken(
  result: string | { token: string; expiresAt?: Date | string | null },
  source: AccessToken,
): ResolvedToken {
  if (typeof result === "string") {
    return { token: result, source };
  }
  const token = result?.token;
  if (typeof token !== "string" || token === "") {
    throw new Error("The access token provider did not return a token.");
  }
  return { token, source, expiresAt: asDate(result.expiresAt) };
}

/** A usable `Date`, or `undefined` for anything that is not one. */
function asDate(value: Date | string | null | undefined): Date | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text === "") {
    return null;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

/**
 * Server prefetch: loads the requested resources (default: all) into a
 * `CompanyData` bag for a provider's `initialData`. Failures are left out
 * rather than thrown, so one unavailable resource does not block a page.
 */
export async function fetchCompanyData(
  client: CompanyClient,
  names?: CompanyResourceName[],
): Promise<CompanyData> {
  const wanted = names ?? ["invoices"];
  const data: CompanyData = {};
  await Promise.all(
    wanted.map(async (name) => {
      try {
        switch (name) {
          case "invoices": {
            const page = await client.fetchInvoices({
              limit: INVOICE_PAGE_SIZE,
              offset: 0,
            });
            data.invoices = {
              invoices: page.invoices,
              count: page.count,
              // No rows means no more of them: the rows and the count are
              // two queries on the server, and a count that outran them
              // would seed a page that pages nothing.
              hasMore:
                page.invoices.length > 0 && page.invoices.length < page.count,
            };
            break;
          }
        }
      } catch {
        // left out
      }
    }),
  );
  return data;
}
