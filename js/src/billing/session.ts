/**
 * The machinery every temporary-access-token surface shares: which session is
 * being read, the credential for it, and the request that carries it. It
 * knows nothing about invoices, subscriptions, or checkout — a domain client
 * (see `SchematicBillingClient`) is constructed over it, and several may
 * share one session rather than each minting tokens of its own.
 */

/** Called once per session, and again when a request comes back 401. */
export type AccessTokenProvider = () => Promise<string | AccessTokenResult>;

/**
 * A bare token, or one that says when it expires and who it was minted for.
 * `company`/`user` are the host restating the pair it asked for; stated, they
 * are checked against the session the resolution was started for.
 */
export interface AccessTokenResult {
  token: string;
  expiresAt?: Date | string | null;
  company?: string;
  user?: string;
}

export type AccessToken = string | AccessTokenProvider;

/**
 * Who is being read. Users and companies are many-to-many: the same person
 * reads one company's billing and then another's, and the same company is
 * read by several people. A token is minted for the pair, so the pair — not
 * the company alone — is the session's identity.
 */
export interface Session {
  /** The host's name for the company, its id in their own system say. */
  company: string;
  /**
   * The user, where the host mints per (company, user). Left out by a host
   * whose tokens are company-wide, and then every reader of that company
   * shares one session.
   */
  user?: string;
  token: AccessToken;
}

/**
 * Three states that are not interchangeable:
 *
 * * `Session` — active: this pair, read with this credential.
 * * `null` — ended: nobody is signed in; what is loaded is dropped.
 * * `undefined` — pending: the host's auth has not resolved. It states
 *   nothing, so the session in hand stands.
 */
export type SessionInput = Session | null | undefined;

export type SessionStatus = "pending" | "active" | "ended";

/**
 * What happened to the session, for anything holding data that belongs to
 * one. `started`: whatever is loaded belongs to the new session — a prefetch
 * the host seeded before its auth resolved. `changed`: another pair is being
 * read, and what is loaded belongs to the pair being left. `ended`: nobody is
 * signed in, and what is loaded belongs to nobody.
 */
export type SessionEvent = { type: "started" | "changed" | "ended" };

export interface SessionOptions {
  session?: SessionInput;
  apiUrl?: string;
  additionalHeaders?: Record<string, string>;
  /** Override for tests and non-browser runtimes. */
  fetch?: typeof fetch;
}

export interface RequestOptions {
  method?: string;
  body?: unknown;
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
 * Sessions whose credentials are kept. A reader switching between the
 * organizations they belong to walks a handful of them and comes back, and
 * re-minting on every step is a round trip to the host's token endpoint for
 * a token this client already holds and has not seen expire. The same
 * handful the flag cache bounds its contexts at.
 */
export const TOKEN_CACHE_SIZE = 10;

/**
 * The pair as one string, for anything that has to compare sessions or key
 * something by one — a prefetch stating which session it was fetched for, a
 * store keeping a page per session. Opaque: read it only by equality.
 */
export function sessionKey(session: Session): string {
  return JSON.stringify([session.company, session.user ?? null]);
}

interface ResolvedToken {
  token: string;
  expiresAt?: Date;
}

interface ResolvingToken {
  promise: Promise<string>;
  forced: boolean;
  /**
   * The session generation it was started under. A settled token is keyed by
   * the pair it turned out to be for; one still in flight is keyed by the
   * pair that asked, which is not the same claim.
   */
  sessionGeneration: number;
}

/**
 * Session identity is the (company, user) pair alone: a freshly minted token,
 * a rebuilt provider closure, and a refresh this session asked for itself are
 * all the same session. Nothing in a token says who it was minted for, so
 * that question is the host's to answer.
 *
 * Credentials survive a change of session, keyed by pair — switching back to
 * a company reads with the token already in hand. They do not survive the
 * session ending: after a sign-out the next person at this page is somebody
 * else, and nothing minted for the last one is theirs to send.
 */
export class SchematicSession {
  private readonly _apiUrl: string;
  private readonly _headers: Record<string, string>;
  private readonly _fetch: typeof fetch;
  private _session: SessionInput;
  private readonly _tokens = new Map<string, ResolvedToken>();
  private readonly _resolving = new Map<string, ResolvingToken>();
  /**
   * Bumped when the session's identity changes, and only then — the object
   * itself is replaced on every render. Anything asking "is this still the
   * session I started under?" counts generations rather than comparing.
   */
  private _generation = 0;
  private readonly _listeners = new Set<(event: SessionEvent) => void>();

  constructor(options: SessionOptions = {}) {
    this._session = options.session;
    this._apiUrl = (options.apiUrl ?? DEFAULT_API_URL).replace(/\/$/, "");
    this._headers = options.additionalHeaders ?? {};
    this._fetch =
      options.fetch ?? ((input, init) => globalThis.fetch(input, init));
  }

  get key(): string | undefined {
    return this._session === null || this._session === undefined
      ? undefined
      : sessionKey(this._session);
  }

  get status(): SessionStatus {
    if (this._session === undefined) {
      return "pending";
    }

    return this._session === null ? "ended" : "active";
  }

  /** Only a statement that changes which pair is read counts as a change. */
  set(session: SessionInput): void {
    if (session === undefined) {
      return;
    }
    const previous = this._session;
    this._session = session;

    if (session === null) {
      if (previous === null) {
        return;
      }
      // Sign-out, not a switch: the next person here is somebody else.
      this._tokens.clear();
      this._resolving.clear();
      this._generation += 1;
      this._emit({ type: "ended" });
      return;
    }

    if (previous !== null && previous !== undefined) {
      if (
        previous.company === session.company &&
        previous.user === session.user
      ) {
        // Same pair, new token object. The credential in hand still belongs
        // to this session; what changed is only what the next resolution
        // calls.
        return;
      }
      this._generation += 1;
      this._emit({ type: "changed" });
      return;
    }

    this._generation += 1;
    this._emit({ type: "started" });
  }

  onChange(listener: (event: SessionEvent) => void): () => void {
    this._listeners.add(listener);
    return () => {
      this._listeners.delete(listener);
    };
  }

  private _emit(event: SessionEvent): void {
    for (const listener of this._listeners) {
      listener(event);
    }
  }

  private _cached(key: string): ResolvedToken | undefined {
    const cached = this._tokens.get(key);
    if (cached === undefined) {
      return undefined;
    }
    if (
      cached.expiresAt !== undefined &&
      cached.expiresAt.getTime() <= Date.now()
    ) {
      this._tokens.delete(key);
      return undefined;
    }
    // Re-inserted so the least recently used session is the one evicted.
    this._tokens.delete(key);
    this._tokens.set(key, cached);
    return cached;
  }

  private _cache(key: string, resolved: ResolvedToken): void {
    this._tokens.delete(key);
    this._tokens.set(key, resolved);
    while (this._tokens.size > TOKEN_CACHE_SIZE) {
      const oldest = this._tokens.keys().next();
      if (oldest.done === true) {
        break;
      }
      this._tokens.delete(oldest.value);
    }
  }

  /**
   * The credential for a session, minted if this one is not held. `force`
   * retires what is held first: the caller is a request the API has just
   * rejected.
   */
  resolveToken(session: Session, force: boolean): Promise<string> {
    const { token } = session;
    if (typeof token === "string") {
      return Promise.resolve(token);
    }
    const key = sessionKey(session);
    if (!force) {
      const cached = this._cached(key);
      if (cached !== undefined) {
        return Promise.resolve(cached.token);
      }
    } else {
      // The cached token is the one the API just rejected; left in place, a
      // request resolving alongside this refresh would take it and 401 too.
      this._tokens.delete(key);
    }

    // Two resolutions this one cannot settle for:
    //
    // * One that started before the token went stale, when this is a forced
    //   refresh — it would hand back the token the API just rejected.
    // * One started under a session that has since changed, even if the host
    //   has changed back. The same reason its token is not cached: the
    //   documented provider mints for the pair the host reads at the moment
    //   it answers, and by then that was somebody else. Settled, a token is
    //   keyed by the pair it turned out to be for; in flight, it is only
    //   keyed by the pair that asked.
    const inflight = this._resolving.get(key);
    if (
      inflight !== undefined &&
      inflight.sessionGeneration === this._generation &&
      (!force || inflight.forced)
    ) {
      return inflight.promise;
    }

    const provider = token;
    const sessionGeneration = this._generation;
    const owns = (): boolean => this._resolving.get(key)?.promise === promise;
    const promise = Promise.resolve()
      .then(() => provider())
      .then((result) => {
        const { resolved, stamped } = asResolvedToken(result, session);
        // The same two hazards the reuse check above names, asked once more
        // now that the answer is in hand — and settled, a stamped token
        // says whose it is, which in flight nothing could.
        if (owns() && (this._generation === sessionGeneration || stamped)) {
          this._cache(key, resolved);
        }
        return resolved.token;
      })
      .finally(() => {
        // Only the resolution that owns the slot may clear it; one swapped in
        // mid-flight has already claimed it.
        if (owns()) {
          this._resolving.delete(key);
        }
      });
    this._resolving.set(key, { promise, forced: force, sessionGeneration });
    return promise;
  }

  /**
   * Sends a request under the active session's credential, refreshing once
   * and retrying if the API rejects it. Rejects rather than answering when
   * the session changes while the request is in flight: the rows would
   * otherwise come back as the answer to a question asked for another pair.
   */
  async request(path: string, options: RequestOptions = {}): Promise<unknown> {
    const { method = "GET", body } = options;
    const send = async (credential: string): Promise<Response> =>
      this._fetch(`${this._apiUrl}${path}`, {
        method,
        headers: {
          "Accept": "application/json",
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
          ...this._headers,
          "X-Schematic-Api-Key": credential,
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });

    // Only a direct caller reaches these; a store reads `status` and stays
    // empty or pending instead.
    const session = this._session;
    if (session === null) {
      throw new Error("There is no session to read data for.");
    }
    if (session === undefined) {
      throw new Error("A session is required to read data.");
    }
    const provider = session.token;
    // Read before the request goes out and rechecked after every await, the
    // wire included: a session stated mid-flight would otherwise have its
    // rows returned as the answer to a question asked for another.
    const generation = this._generation;
    const stillOurs = async (response?: Response): Promise<void> => {
      if (this._generation === generation) {
        return;
      }
      // For the reason the 401 path drains: a body nobody reads holds the
      // connection until it is collected, and a reader clicking through
      // companies abandons one per switch.
      if (response !== undefined) {
        await discardBody(response);
      }
      throw new Error("The session changed while this request was in flight.");
    };

    const credential = await this.resolveToken(session, false);
    if (this._generation !== generation) {
      throw new Error("The session changed before this request was sent.");
    }

    let response = await send(credential);
    await stillOurs(response);

    if (
      response.status === 401 &&
      typeof provider === "function" &&
      this._generation === generation
    ) {
      // Drained to release the connection, and kept because a body reads
      // once and this is the answer if the retry is abandoned.
      const status = response.status;
      const rejected = await readBody(response);
      let retried = false;

      // What the session says now, not the closure this request captured — a
      // same-pair restatement changes only what the next resolution calls.
      const current = this._session;
      if (
        this._generation === generation &&
        current !== null &&
        current !== undefined
      ) {
        const refreshed = await this.resolveToken(current, true);
        if (this._generation === generation) {
          response = await send(refreshed);
          await stillOurs(response);
          retried = true;
        }
      }

      if (!retried) {
        throw new SchematicApiError(status, path, rejected);
      }
    }

    const parsed = await readBody(response);
    // The body streams, and a page of invoices is not one packet: the switch
    // has as long to land here as the download takes. Read already, so
    // there is nothing left to release.
    await stillOurs();
    if (!response.ok) {
      throw new SchematicApiError(response.status, path, parsed);
    }
    return parsed;
  }
}

/**
 * `expiresAt` arrives as a string from a parsed response body, and `.json()`
 * being `any` means the declared `Date` catches nothing — left as-is it
 * throws a request later, inside `getTime`.
 */
function asResolvedToken(
  result: string | AccessTokenResult,
  session: Session,
): { resolved: ResolvedToken; stamped: boolean } {
  if (typeof result === "string") {
    return { resolved: { token: result }, stamped: false };
  }
  const token = result?.token;
  if (typeof token !== "string" || token === "") {
    throw new Error("The access token provider did not return a token.");
  }
  // A provider reading a session this client has not been told about yet
  // would otherwise mint the next pair's token for a request made for this
  // one. Only what the session states can be contradicted: a host whose
  // sessions are company-wide names no user, and its token endpoint knows
  // who authenticated and says so — that is not a disagreement, and reading
  // it as one fails every request it ever makes.
  if (
    (result.company !== undefined && result.company !== session.company) ||
    (result.user !== undefined &&
      session.user !== undefined &&
      result.user !== session.user)
  ) {
    throw new Error(
      "The access token provider returned a token for a different session.",
    );
  }
  // Stated and checked, so this token is known to be the pair's — the only
  // way to know it after the session has moved on under the resolution. A
  // session that names a user needs the user stated to say that much.
  const stamped =
    result.company !== undefined &&
    (session.user === undefined || result.user !== undefined);
  return { resolved: { token, expiresAt: asDate(result.expiresAt) }, stamped };
}

function asDate(value: Date | string | null | undefined): Date | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

async function discardBody(response: Response): Promise<void> {
  try {
    await response.body?.cancel();
  } catch {
    // Already read, or a runtime whose Response carries no stream.
  }
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
