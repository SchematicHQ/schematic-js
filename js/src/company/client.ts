import { GetCompanyInvoicesResponseFromJSON } from "./api/company/models";
import type {
  CompanyData,
  CompanyResourceName,
  Invoice,
  InvoiceQuery,
} from "./contract";

/** Called once per session, and again when a request comes back 401. */
export type AccessTokenProvider = () => Promise<
  | string
  | { token: string; expiresAt?: Date | string | null; sessionKey?: string }
>;
export type AccessToken = string | AccessTokenProvider;

export interface CompanySession {
  /** The host's name for the company, its id in their own system say. */
  key: string;
  token: AccessToken;
}

/**
 * Three states that are not interchangeable:
 *
 * * `CompanySession` — active: this company, read with this credential.
 * * `null` — ended: nobody is signed in; what is loaded is dropped.
 * * `undefined` — pending: the host's auth has not resolved. It states
 *   nothing, so the session in hand stands.
 */
export type SessionInput = CompanySession | null | undefined;

/** Which of the three the client is in; pending until the host states one. */
export type SessionStatus = "pending" | "active" | "ended";

/**
 * `started`: whatever is loaded belongs to the new session — a prefetch the
 * host seeded before its auth resolved. `changed` and `ended`: it belongs to
 * nobody and is dropped.
 */
export type SessionEvent = { type: "started" | "changed" | "ended" };

export interface InvoicesRequest extends InvoiceQuery {
  limit: number;
  offset: number;
}

/** The rows asked for, and how many the query matches in total. */
export interface InvoicesResult {
  invoices: Invoice[];
  count: number;
}

export interface CompanyClient {
  fetchInvoices(params: InvoicesRequest): Promise<InvoicesResult>;

  readonly sessionStatus: SessionStatus;

  readonly sessionKey?: string;

  setSession?(session: SessionInput): void;
  onSessionChange?(listener: (event: SessionEvent) => void): () => void;
}

export interface CompanyClientOptions {
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

export const INVOICE_PAGE_SIZE = 12;

/** A `limit` above this is a 400 (PaginationFilter in schematic-api). */
export const INVOICE_MAX_PAGE_SIZE = 250;

interface ResolvedToken {
  token: string;
  expiresAt?: Date;
  /** The company it was minted for, when the provider says. */
  sessionKey?: string;
}

interface ResolvingToken {
  promise: Promise<string>;
  forced: boolean;
  /** Tells this resolution apart from one that replaces it in the slot. */
  generation: number;
}

/**
 * Session identity is the key alone: a freshly minted token, a rebuilt
 * provider closure, and a refresh this client asked for itself are all the
 * same session. Nothing in a token says which company it was minted for, so
 * that question is the host's to answer.
 */
export class SchematicCompanyClient implements CompanyClient {
  private readonly _apiUrl: string;
  private readonly _headers: Record<string, string>;
  private readonly _fetch: typeof fetch;
  private _session: SessionInput;
  private _resolved: ResolvedToken | undefined;
  private _resolving: ResolvingToken | undefined;
  private _resolveGeneration = 0;
  /**
   * Bumped when the session's identity changes, and only then — the object
   * itself is replaced on every render. Anything asking "is this still the
   * session I started under?" counts generations rather than comparing.
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

  /** Only a statement that changes which company is read counts as a change. */
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
        // Same company, new token object. The credential in hand still
        // belongs to this session; what changed is only what the next
        // resolution calls.
        return;
      }
      this._dropCredential();
      this._emit({ type: "changed" });
      return;
    }

    this._dropCredential();
    this._emit({ type: "started" });
  }

  onSessionChange(listener: (event: SessionEvent) => void): () => void {
    this._listeners.add(listener);
    return () => {
      this._listeners.delete(listener);
    };
  }

  /** Retires anything on the wire for the old session along with it. */
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
      // The generated decoder throws on a null where an empty history is
      // the right answer. `== null` catches the omitted field too.
      const data = (body as { data: unknown }).data as {
        invoices?: unknown;
      } | null;
      if (data == null || data.invoices == null) {
        return { invoices: [], count: 0 };
      }
      const decoded = GetCompanyInvoicesResponseFromJSON(body).data;
      return { invoices: decoded.invoices, count: decoded.count };
    });
  }

  private async _credential(): Promise<string> {
    // Only a direct caller reaches these; a store reads `sessionStatus`
    // and stays empty or pending instead.
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
      // The cached token is the one the API just rejected; left in place, a
      // request resolving alongside this refresh would take it and 401 too.
      this._resolved = undefined;
    }

    // A forced resolution cannot settle for one that started before the
    // token went stale — that would hand back the token just rejected.
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
        // A provider ahead of this client would otherwise mint the next
        // company's token for a request made for this one.
        if (
          resolved.sessionKey !== undefined &&
          this._session?.key !== resolved.sessionKey
        ) {
          throw new Error(
            "The access token provider returned a token for a different company.",
          );
        }
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

    // Read before the request goes out and rechecked after every await: a
    // company stated mid-flight would otherwise have its rows returned as
    // the answer to a question asked for another.
    const session = this._session;
    const generation = this._sessionGeneration;
    const provider =
      session === null || session === undefined ? undefined : session.token;

    const credential = await this._credential();
    if (this._sessionGeneration !== generation) {
      throw new Error("The session changed before this request was sent.");
    }

    let response = await send(credential);

    if (
      response.status === 401 &&
      typeof provider === "function" &&
      this._sessionGeneration === generation
    ) {
      // Drained to release the connection, and kept because a body reads
      // once and this is the answer if the retry is abandoned.
      const status = response.status;
      const rejected = await readBody(response);
      let retried = false;

      if (this._sessionGeneration === generation) {
        // What the session says now, not the closure this request
        // captured — a same-company restatement changes only what the next
        // resolution calls.
        const current = this._session;
        const mint =
          current === null || current === undefined ? provider : current.token;
        const refreshed = await this._resolveToken(mint, true);
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
 * `expiresAt` arrives as a string from a parsed response body, and `.json()`
 * being `any` means the declared `Date` catches nothing — left as-is it
 * throws a request later, inside `getTime`.
 */
function asResolvedToken(
  result:
    | string
    | { token: string; expiresAt?: Date | string | null; sessionKey?: string },
): ResolvedToken {
  if (typeof result === "string") {
    return { token: result };
  }
  const token = result?.token;
  if (typeof token !== "string" || token === "") {
    throw new Error("The access token provider did not return a token.");
  }
  return {
    token,
    expiresAt: asDate(result.expiresAt),
    sessionKey: result.sessionKey,
  };
}

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

export interface CompanyPrefetchOptions {
  names?: CompanyResourceName[];
  /** The invoice query to prefetch for; the element must ask the same one. */
  invoices?: InvoiceQuery;
}

/**
 * Server prefetch for a provider's `initialData`. A resource that fails is
 * left out rather than thrown, so one of them cannot block a page.
 */
export async function fetchCompanyData(
  client: CompanyClient,
  options: CompanyPrefetchOptions = {},
): Promise<CompanyData> {
  const wanted = options.names ?? ["invoices"];
  const data: CompanyData = {};
  if (options.invoices !== undefined) {
    // An element asking a different query would never read these rows and
    // would fetch the same page again.
    data.params = { invoices: options.invoices };
  }
  // A page rendered before its auth resolves hands these rows to whichever
  // session turns up; it has to be the one they were fetched for.
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
              // Two queries on the server: a count that outran the rows
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
