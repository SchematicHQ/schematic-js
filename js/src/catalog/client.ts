import type {
  AnyCatalog,
  CatalogData,
  CatalogResourceName,
  CompanyContext,
  CreditBalanceEntry,
  FeatureUsageRow,
  Invoice,
  UpcomingInvoice,
} from "./contract";
import {
  decodeCatalog,
  decodeCompany,
  decodeCreditBalances,
  decodeFeatureUsage,
  decodeInvoices,
  decodeUpcomingInvoice,
} from "./decode";

/**
 * An access token as a string, or an async provider the client calls (and
 * re-calls after a 401) that returns the token, optionally with its expiry.
 */
export type AccessTokenProvider = () => Promise<
  string | { token: string; expiresAt?: Date }
>;
export type AccessToken = string | AccessTokenProvider;

/** The client interface the React provider consumes (mirrored in schematic-react). */
export interface CatalogClient {
  fetchCatalog(): Promise<AnyCatalog>;
  fetchCompany(): Promise<CompanyContext>;
  fetchFeatureUsage(): Promise<FeatureUsageRow[]>;
  fetchCreditBalances(): Promise<CreditBalanceEntry[]>;
  fetchInvoices(params: { limit: number; offset: number }): Promise<Invoice[]>;
  fetchUpcomingInvoice(): Promise<UpcomingInvoice | null>;
  onCredentialsChange?(listener: () => void): () => void;
  setAccessToken?(token: AccessToken | undefined): void;
}

export interface CatalogClientOptions {
  /** Publishable key: serves the public catalog. */
  publishableKey?: string;
  /** Temporary access token (or provider): serves the company catalog and `/company/*`. */
  accessToken?: AccessToken;
  /** A specific catalog; default the environment's default catalog. */
  catalogId?: string;
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
 * The catalog API client: resolves credentials, picks the public or company
 * form of the catalog, and decodes responses into the contract types.
 *
 * Token handling: a string token is used as-is; a provider is called once
 * and cached (single-flight) until it expires or a request returns 401, in
 * which case it is called again and the request retried once.
 */
export class SchematicCatalogClient implements CatalogClient {
  private readonly _publishableKey: string | undefined;
  private readonly _catalogId: string | undefined;
  private readonly _apiUrl: string;
  private readonly _headers: Record<string, string>;
  private readonly _fetch: typeof fetch;
  private _accessToken: AccessToken | undefined;
  private _resolved: { token: string; expiresAt?: Date } | undefined;
  private _resolving: Promise<string> | undefined;
  private readonly _listeners = new Set<() => void>();

  constructor(options: CatalogClientOptions = {}) {
    this._publishableKey = options.publishableKey;
    this._accessToken = options.accessToken;
    this._catalogId = options.catalogId;
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
   * Installs or clears the access token. A different string, or a different
   * provider function, is a different session: listeners are told so the
   * store can drop every resource.
   */
  setAccessToken(token: AccessToken | undefined): void {
    if (token === this._accessToken) {
      return;
    }
    this._accessToken = token;
    this._resolved = undefined;
    this._resolving = undefined;
    for (const listener of this._listeners) {
      listener();
    }
  }

  onCredentialsChange(listener: () => void): () => void {
    this._listeners.add(listener);
    return () => {
      this._listeners.delete(listener);
    };
  }

  fetchCatalog(): Promise<AnyCatalog> {
    if (this._accessToken !== undefined) {
      const path =
        this._catalogId === undefined
          ? "/catalog/view"
          : `/catalogs/${encodeURIComponent(this._catalogId)}/view`;
      return this._request(path, "token").then(decodeCatalog);
    }
    const path =
      this._catalogId === undefined
        ? "/public/catalog"
        : `/public/catalogs/${encodeURIComponent(this._catalogId)}`;
    return this._request(path, "key").then(decodeCatalog);
  }

  fetchCompany(): Promise<CompanyContext> {
    return this._request("/company", "token").then(decodeCompany);
  }

  fetchFeatureUsage(): Promise<FeatureUsageRow[]> {
    return this._request("/company/usage", "token").then(decodeFeatureUsage);
  }

  fetchCreditBalances(): Promise<CreditBalanceEntry[]> {
    return this._request("/company/credits", "token").then(
      decodeCreditBalances,
    );
  }

  fetchInvoices(params: { limit: number; offset: number }): Promise<Invoice[]> {
    const query = new URLSearchParams({
      limit: String(params.limit),
      offset: String(params.offset),
    });
    return this._request(`/company/invoices?${query}`, "token").then(
      decodeInvoices,
    );
  }

  fetchUpcomingInvoice(): Promise<UpcomingInvoice | null> {
    return this._request("/company/upcoming-invoice", "token", {
      nullOn: [204, 404],
    }).then(decodeUpcomingInvoice);
  }

  private async _credential(kind: "key" | "token"): Promise<string> {
    if (kind === "key") {
      if (this._publishableKey === undefined) {
        throw new Error(
          "A publishable key is required to read the public catalog.",
        );
      }
      return this._publishableKey;
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
      cached !== undefined &&
      (cached.expiresAt === undefined ||
        cached.expiresAt.getTime() > Date.now())
    ) {
      return Promise.resolve(cached.token);
    }
    if (this._resolving === undefined) {
      const provider = token;
      this._resolving = provider()
        .then((result) => {
          const resolved =
            typeof result === "string" ? { token: result } : result;
          if (this._accessToken === provider) {
            this._resolved = resolved;
          }
          return resolved.token;
        })
        .finally(() => {
          this._resolving = undefined;
        });
    }
    return this._resolving;
  }

  private async _request(
    path: string,
    auth: "key" | "token",
    options: { nullOn?: number[] } = {},
  ): Promise<unknown> {
    const send = async (credential: string): Promise<Response> =>
      this._fetch(`${this._apiUrl}${path}`, {
        method: "GET",
        headers: {
          "Accept": "application/json",
          ...this._headers,
          "X-Schematic-Api-Key": credential,
        },
      });

    let response = await send(await this._credential(auth));

    // A stale token from a provider: refresh once and retry.
    if (
      response.status === 401 &&
      auth === "token" &&
      typeof this._accessToken === "function"
    ) {
      response = await send(await this._resolveToken(this._accessToken, true));
    }

    if (options.nullOn?.includes(response.status) === true) {
      return null;
    }
    const body = await readBody(response);
    if (!response.ok) {
      throw new SchematicApiError(response.status, path, body);
    }
    return body;
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

/**
 * Server prefetch: loads the requested resources (default: all that the
 * credentials allow) into a `CatalogData` bag for a provider's `initialData`.
 * Failures are left out rather than thrown, so one unavailable resource does
 * not block a page.
 */
export async function fetchCatalogData(
  client: CatalogClient & { hasAccessToken?: boolean },
  names?: CatalogResourceName[],
): Promise<CatalogData> {
  const wanted =
    names ??
    (client.hasAccessToken === false
      ? ["catalog"]
      : [
          "catalog",
          "company",
          "usage",
          "credits",
          "invoices",
          "upcomingInvoice",
        ]);
  const data: CatalogData = {};
  await Promise.all(
    wanted.map(async (name) => {
      try {
        switch (name) {
          case "catalog":
            data.catalog = await client.fetchCatalog();
            break;
          case "company":
            data.company = await client.fetchCompany();
            break;
          case "usage":
            data.usage = await client.fetchFeatureUsage();
            break;
          case "credits":
            data.credits = await client.fetchCreditBalances();
            break;
          case "invoices": {
            const rows = await client.fetchInvoices({ limit: 13, offset: 0 });
            data.invoices = {
              invoices: rows.slice(0, 12),
              hasMore: rows.length > 12,
            };
            break;
          }
          case "upcomingInvoice":
            data.upcomingInvoice = await client.fetchUpcomingInvoice();
            break;
        }
      } catch {
        // left out
      }
    }),
  );
  return data;
}
