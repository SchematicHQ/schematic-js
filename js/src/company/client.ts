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

/**
 * An active session: the company being read, and the credential for it.
 *
 * The key is the identity — a different key is a different company — and the
 * token is how that company is read. They travel together because they
 * describe one thing: a token minted for a different company than the key
 * names is not a state worth being able to express.
 */
export interface CompanySession {
  /** The host's name for the company, its id in their own system say. */
  key: string;
  /** A token string, or a provider called (and re-called after a 401). */
  token: AccessToken;
}

/**
 * What the host says about the session, in three states that are not
 * interchangeable:
 *
 * * a `CompanySession` — active: this company, read with this credential.
 * * `null` — ended: nobody is signed in. What is loaded is dropped, and
 *   nothing is read until a session arrives.
 * * `undefined` — pending: the host does not know yet, which every async
 *   auth renders before it resolves. It states nothing, so the session in
 *   hand stands and a flicker back to it changes nothing.
 */
export type SessionInput = CompanySession | null | undefined;

/** Which of the three the client is in; pending until the host states one. */
export type SessionStatus = "pending" | "active" | "ended";

/**
 * What happened to the session, for a store deciding what to do about it.
 *
 * `started` means there is now a session to read for, and whatever is loaded
 * belongs to it — a prefetch the host seeded before its auth resolved.
 * `changed` is a different company, so what is loaded belongs to nobody.
 * `ended` is the same, and nothing is read until a session returns.
 */
export type SessionEvent = { type: "started" | "changed" | "ended" };

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
  /** Which state the session is in; a store reads it before fetching. */
  readonly sessionStatus: SessionStatus;
  /** The company being read, for a store checking what a prefetch belongs to. */
  readonly sessionKey?: string;
  /** States the session; see `SessionInput` for what each state means. */
  setSession?(session: SessionInput): void;
  onSessionChange?(listener: (event: SessionEvent) => void): () => void;
}

export interface CompanyClientOptions {
  /** The session to read for; omitted, the client is pending until told. */
  session?: SessionInput;
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

/** A token a provider handed back, and when it stops being usable. */
interface ResolvedToken {
  token: string;
  expiresAt?: Date;
}

/** An in-flight call to a token provider, and whether a 401 forced it. */
interface ResolvingToken {
  promise: Promise<string>;
  forced: boolean;
  /** Tells this resolution apart from one that replaces it in the slot. */
  generation: number;
}

/**
 * The company API client — today, the `/company/invoices` slice of it; the
 * catalog and remaining company reads ship with their elements.
 *
 * A session names the company and carries the credential for it, and
 * identity is the key alone. A token endpoint that mints a fresh string per
 * call, a host that rebuilds its provider closure every render, and a
 * refresh this client asked for itself are all the same session, because
 * none of them changed the key. Nothing in a token says which company it was
 * minted for, so the question is the host's to answer, and the key is the
 * answer.
 *
 * Token handling within a session: a string is used as-is; a provider is
 * called once and cached (single-flight) until it expires or a request
 * returns 401, in which case it is called again and the request retried.
 */
export class SchematicCompanyClient implements CompanyClient {
  private readonly _apiUrl: string;
  private readonly _headers: Record<string, string>;
  private readonly _fetch: typeof fetch;
  /** The session in hand: the last one stated, pending until there is one. */
  private _session: SessionInput;
  /** A provider's answer, held until it expires or a 401 rejects it. */
  private _resolved: ResolvedToken | undefined;
  private _resolving: ResolvingToken | undefined;
  private _resolveGeneration = 0;
  /**
   * Bumped when the session's identity changes, and only then. The object
   * itself is replaced far more often — a host rebuilding `{ key, token }`
   * every render states the same session again — so anything that has to
   * ask "is this still the session I started under?" counts generations
   * rather than comparing objects.
   */
  private _sessionGeneration = 0;
  private readonly _listeners = new Set<(event: SessionEvent) => void>();

  constructor(options: CompanyClientOptions = {}) {
    this._session = options.session;
    this._apiUrl = (options.apiUrl ?? DEFAULT_API_URL).replace(/\/$/, "");
    this._headers = options.additionalHeaders ?? {};
    this._fetch =
      options.fetch ?? ((input, init) => globalThis.fetch(input, init));
  }

  /** The company being read, or `undefined` when there is no active session. */
  get sessionKey(): string | undefined {
    return this._session === null || this._session === undefined
      ? undefined
      : this._session.key;
  }

  get sessionStatus(): SessionStatus {
    if (this._session === undefined) {
      return "pending";
    }

    return this._session === null ? "ended" : "active";
  }

  /**
   * States the session. Only a statement that changes which company is being
   * read is a change: pending states nothing, and a new token for the same
   * key is this session with a fresh credential, which is what a token
   * endpoint hands back on every call.
   */
  setSession(session: SessionInput): void {
    if (session === undefined) {
      return;
    }
    const previous = this._session;
    this._session = session;

    if (session === null) {
      if (previous === null) {
        return;
      }
      this._dropCredential();
      this._emit({ type: "ended" });
      return;
    }

    if (previous !== null && previous !== undefined) {
      if (previous.key === session.key) {
        // The same company with a different token object: a closure rebuilt
        // on a render, or a rotated string. The credential in hand still
        // belongs to this session and stands until it expires or a 401
        // rejects it; what changed is only what the next resolution calls.
        return;
      }
      this._dropCredential();
      this._emit({ type: "changed" });
      return;
    }

    // From pending or ended: there is a session to read for now, and
    // whatever is loaded is a prefetch the host seeded for it.
    this._dropCredential();
    this._emit({ type: "started" });
  }

  onSessionChange(listener: (event: SessionEvent) => void): () => void {
    this._listeners.add(listener);
    return () => {
      this._listeners.delete(listener);
    };
  }

  /**
   * Forgets the credential in hand and retires anything on the wire for it:
   * an answer to a request the previous session asked for is that session's
   * token, and must not be adopted for this one.
   */
  private _dropCredential(): void {
    this._resolved = undefined;
    this._resolving = undefined;
    this._resolveGeneration += 1;
    this._sessionGeneration += 1;
  }

  private _emit(event: SessionEvent): void {
    for (const listener of this._listeners) {
      listener(event);
    }
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
    // Only a direct caller reaches these: a store holding this client reads
    // `sessionStatus` and stays empty or pending instead, so an element
    // shows a signed-out reader nothing rather than a message meant for
    // whoever wired the page.
    const session = this._session;
    if (session === null) {
      throw new Error("There is no session to read company data for.");
    }
    if (session === undefined) {
      throw new Error("A session is required to read company data.");
    }
    return this._resolveToken(session.token, false);
  }

  private _resolveToken(token: AccessToken, force: boolean): Promise<string> {
    if (typeof token === "string") {
      return Promise.resolve(token);
    }
    const cached = this._resolved;
    if (
      !force &&
      cached !== undefined &&
      (cached.expiresAt === undefined ||
        cached.expiresAt.getTime() > Date.now())
    ) {
      return Promise.resolve(cached.token);
    }

    if (force) {
      // The cached token is the one the API just rejected. Left in place, a
      // request resolving alongside this refresh would take it, 401 in its
      // turn, and force a second refresh of its own.
      this._resolved = undefined;
    }

    // A forced resolution cannot settle for one that started before the
    // token went stale — that would hand back the token the API just
    // rejected. Concurrent forced calls still share a request.
    const inflight = this._resolving;
    if (inflight !== undefined && (!force || inflight.forced)) {
      return inflight.promise;
    }

    const provider = token;
    const sessionGeneration = this._sessionGeneration;
    const generation = ++this._resolveGeneration;
    const promise = Promise.resolve()
      .then(() => provider())
      .then((result) => {
        const resolved = asResolvedToken(result);
        // A session that replaced this one while it was on the wire wins,
        // and so does a resolution opened after this one — a forced refresh
        // supersedes the call that was still running when the API rejected
        // its token. Counted, not compared: the same session restated with a
        // rebuilt closure is still the session this answer belongs to, and
        // discarding it there would re-ask the token endpoint on every
        // render.
        if (
          this._sessionGeneration !== sessionGeneration ||
          generation !== this._resolveGeneration
        ) {
          return resolved.token;
        }
        this._resolved = resolved;
        return resolved.token;
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

    // Read before the request goes out, and checked again after: the answer
    // to a call this session made is this session's to retry. A company
    // stated while it was on the wire would otherwise have its token sent as
    // the retry for a request made for the one before it, and its rows
    // returned as that request's answer.
    const session = this._session;
    const generation = this._sessionGeneration;
    const provider =
      session === null || session === undefined ? undefined : session.token;

    let response = await send(await this._credential());

    if (
      response.status === 401 &&
      typeof provider === "function" &&
      this._sessionGeneration === generation
    ) {
      // Drained so its connection is released rather than held open for the
      // life of the retry — and kept, because it is the answer this request
      // gets if the retry is abandoned. A body can only be read once.
      const status = response.status;
      const rejected = await readBody(response);
      let retried = false;

      // Checked again after each await: a company stated while the body
      // drained or while the token minted would have its credential sent as
      // this request's retry, and its rows returned as this request's
      // answer.
      if (this._sessionGeneration === generation) {
        const refreshed = await this._resolveToken(provider, true);
        if (this._sessionGeneration === generation) {
          response = await send(refreshed);
          retried = true;
        }
      }

      if (!retried) {
        throw new SchematicApiError(status, path, rejected);
      }
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
): ResolvedToken {
  if (typeof result === "string") {
    return { token: result };
  }
  const token = result?.token;
  if (typeof token !== "string" || token === "") {
    throw new Error("The access token provider did not return a token.");
  }
  return { token, expiresAt: asDate(result.expiresAt) };
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

/** What to prefetch, and for which query where a resource takes one. */
export interface CompanyPrefetchOptions {
  /** Resources to load; every one by default. */
  names?: CompanyResourceName[];
  /** The invoice query to prefetch for; the element must ask the same one. */
  invoices?: InvoiceQuery;
}

/**
 * Server prefetch: loads the requested resources (default: all) into a
 * `CompanyData` bag for a provider's `initialData`. Failures are left out
 * rather than thrown, so one unavailable resource does not block a page.
 */
export async function fetchCompanyData(
  client: CompanyClient,
  options: CompanyPrefetchOptions = {},
): Promise<CompanyData> {
  const wanted = options.names ?? ["invoices"];
  const data: CompanyData = {};
  if (options.invoices !== undefined) {
    // Carried with the rows so the store seeds them under the query they
    // answer: seeded under the defaults, an element asking anything else
    // would never read them and would fetch the same page again.
    data.params = { invoices: options.invoices };
  }
  // And which company they are: a page rendered before its auth resolves
  // hands these rows to whichever session turns up, and that has to be the
  // one they were fetched for.
  data.sessionKey = client.sessionKey;
  await Promise.all(
    wanted.map(async (name) => {
      try {
        switch (name) {
          case "invoices": {
            const page = await client.fetchInvoices({
              ...(options.invoices ?? {}),
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
