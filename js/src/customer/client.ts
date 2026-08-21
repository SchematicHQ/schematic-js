import { version } from "../version";

import {
  Configuration as CustomerConfiguration,
  CheckoutexternalApi,
  type CompanyCatalogResponseData,
  type CompanyContextResponseData,
  type CompanyCreditBalancesResponseData,
  type CompanyFeatureUsageResponseData,
  type CompanyInvoiceResponseData,
  type CompanyUpcomingInvoiceResponseData,
  type Middleware,
} from "./api/customer";
import {
  Configuration as PublicConfiguration,
  CatalogsApi,
  type PublicCatalogResponseData,
} from "./api/public";
import { AccessTokenManager, type AccessTokenInput } from "./credentials";
import { Resource, type ResourceOptions } from "./resource";

export interface SchematicCustomerClientOptions {
  /** Overrides the API base URL (e.g. for spinup environments). */
  apiUrl?: string;
  /**
   * Temporary access token (or async provider of one) for a company-scoped
   * session. Enables the company catalog view and the /company resources.
   */
  accessToken?: AccessTokenInput;
  /** Targets a specific catalog; omitted, the environment default is used. */
  catalogId?: string;
  /** Extra headers sent on every request. */
  headers?: Record<string, string>;
  /** Custom fetch implementation (tests, React Native). */
  fetchApi?: typeof fetch;
  /**
   * Server-prefetched data (see fetchCatalog and friends) to seed the
   * resource stores with, so the first client render is complete rather
   * than pending. Each entry seeds the resource for the client's default
   * parameters (its catalogId / credential mode, the default invoice page).
   */
  initialData?: CustomerInitialData;
  /**
   * Publishable key (api_…) for the anonymous catalog. Safe to ship in
   * frontend code.
   */
  publishableKey?: string;
  /** How long fetched resources stay fresh; default 30s. */
  staleTimeMs?: number;
}

/**
 * The catalog as this client can see it: the anonymous shape with a
 * publishable key, the company-decorated shape with an access token. The
 * company shape is a superset, so consumers can read the shared core
 * without branching.
 */
export type CustomerCatalog =
  | ({ mode: "public" } & PublicCatalogResponseData)
  | ({ mode: "company" } & CompanyCatalogResponseData);

/** Which catalog shape to fetch; defaults to company when a token is held. */
export type CatalogMode = "company" | "public";

export interface CatalogParams {
  /** Targets a specific catalog; omitted, the environment default is used. */
  catalogId?: string;
  /**
   * "public" forces the anonymous catalog even when an access token is
   * configured (a logged-in user on the public pricing page); "company"
   * requires a token. Omitted, the token decides.
   */
  mode?: CatalogMode;
}

export interface ListInvoicesParams {
  includePending?: boolean;
  /** Page size; fetchMoreInvoices() appends another page. Default 10. */
  limit?: number;
}

/** One or more pages of invoice history, newest first. */
export interface InvoicePage {
  /** Whether another page exists beyond the rows held. */
  hasMore: boolean;
  rows: CompanyInvoiceResponseData[];
}

export interface CustomerInitialData {
  catalog?: CustomerCatalog;
  company?: CompanyContextResponseData;
  creditBalances?: CompanyCreditBalancesResponseData;
  featureUsage?: CompanyFeatureUsageResponseData[];
  invoices?: InvoicePage;
  upcomingInvoice?: CompanyUpcomingInvoiceResponseData | null;
}

const DEFAULT_INVOICE_PAGE_SIZE = 10;

/**
 * Normalized HTTP error for failed API requests: carries the status code
 * and the API's error message, so a 404 (e.g. the catalog endpoints behind
 * a not-yet-enabled feature flag) is distinguishable from an auth problem
 * without parsing a generic "Response returned an error code".
 */
export class SchematicApiError extends Error {
  override name = "SchematicApiError" as const;
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const isResponseError = (err: unknown): err is Error & { response: Response } =>
  err instanceof Error &&
  err.name === "ResponseError" &&
  "response" in err &&
  (err as { response?: unknown }).response instanceof Response;

/**
 * Converts a generated-client ResponseError into a SchematicApiError with
 * the status and the API's `{ "error": … }` body message. Other errors pass
 * through untouched.
 */
const normalizeError = async (err: unknown): Promise<unknown> => {
  if (!isResponseError(err)) {
    return err;
  }
  const { status } = err.response;
  let detail: string | undefined;
  try {
    const body: unknown = await err.response.clone().json();
    if (body !== null && typeof body === "object" && "error" in body) {
      const errorValue = (body as { error: unknown }).error;
      if (typeof errorValue === "string" && errorValue !== "") {
        detail = errorValue;
      }
    }
  } catch {
    // Non-JSON body; the status alone will have to do.
  }
  return new SchematicApiError(
    `Request failed with status ${status}${detail !== undefined ? `: ${detail}` : ""}`,
    status,
  );
};

/**
 * SchematicCustomerClient is the data layer for customer-facing billing
 * surfaces (pricing tables, plan managers, usage meters) built on the
 * catalog API. It owns credentials, fetching, and per-endpoint resource
 * caches; view-model builders and React hooks consume it.
 */
export class SchematicCustomerClient {
  private readonly _options: SchematicCustomerClientOptions;
  private _tokens?: AccessTokenManager;
  private _publicApi?: CatalogsApi;
  private _customerApi?: CheckoutexternalApi;
  private readonly _resources = new Map<string, Resource<unknown>>();
  private readonly _configListeners = new Set<() => void>();
  private readonly _invoicePages = new Map<string, number>();

  constructor(options: SchematicCustomerClientOptions) {
    if (
      options.publishableKey === undefined &&
      options.accessToken === undefined
    ) {
      throw new Error(
        "SchematicCustomerClient requires a publishableKey or an accessToken",
      );
    }
    this._options = { ...options };
    this._build();
  }

  /** True when a company-scoped access token is configured. */
  get hasAccessToken(): boolean {
    return this._tokens !== undefined;
  }

  /**
   * Notifies when the client's credential mode changes (setAccessToken /
   * resetSession), so bindings can re-evaluate which resources are
   * available. Returns an unsubscribe function; snapshot hasAccessToken.
   */
  subscribeConfiguration(listener: () => void): () => void {
    this._configListeners.add(listener);
    return () => {
      this._configListeners.delete(listener);
    };
  }

  /**
   * The catalog resource. The token decides the shape — company-decorated
   * with an access token, anonymous otherwise — unless `mode` overrides it;
   * `catalogId` overrides the client's default catalog.
   */
  catalog(params?: CatalogParams): Resource<CustomerCatalog> {
    const catalogId = params?.catalogId ?? this._options.catalogId;
    const mode: CatalogMode =
      params?.mode ?? (this._customerApi !== undefined ? "company" : "public");
    if (mode === "company") {
      this._requireCustomer("catalog in company mode");
    }
    if (mode === "public" && this._publicApi === undefined) {
      throw new Error(
        'catalog with mode "public" requires a publishableKey; only an accessToken is configured',
      );
    }
    // Server-prefetched data seeds the resource it actually describes —
    // same shape (a public catalog prefetched for an SSR page must not
    // stand in for the company view) and same catalog — whichever call
    // creates that resource first.
    const seed = this._options.initialData?.catalog;
    const seedMatches =
      seed !== undefined &&
      seed.mode === mode &&
      (catalogId === undefined || seed.id === catalogId);
    return this._resource(
      `catalog:${mode}:${catalogId ?? ""}`,
      async () => {
        if (mode === "company") {
          const api = this._requireCustomer("catalog in company mode");
          const response =
            catalogId !== undefined
              ? await api.getCatalogViewByID({ catalogId })
              : await api.getCatalogView();
          return { mode: "company" as const, ...response.data };
        }
        const api = this._requirePublic("catalog");
        const response =
          catalogId !== undefined
            ? await api.getPublicCatalogByID({ catalogId })
            : await api.getPublicCatalog();
        return { mode: "public" as const, ...response.data };
      },
      seedMatches ? seed : undefined,
    );
  }

  /**
   * The company: its plan and held add-ons, subscription facts, custom
   * billing, and any scheduled downgrade. Token required.
   */
  company(): Resource<CompanyContextResponseData> {
    this._requireCustomer("company");
    // Fetchers resolve the API at request time, not creation time, so a
    // credential swap through setAccessToken applies to cached resources.
    return this._resource(
      "company",
      async () => (await this._requireCustomer("company").getCompany()).data,
      this._options.initialData?.company,
    );
  }

  /** The company's credit balances, grouped by credit. Token required. */
  creditBalances(): Resource<CompanyCreditBalancesResponseData> {
    this._requireCustomer("creditBalances");
    return this._resource(
      "creditBalances",
      async () =>
        (
          await this._requireCustomer(
            "creditBalances",
          ).getCompanyCreditBalances()
        ).data,
      this._options.initialData?.creditBalances,
    );
  }

  /**
   * The company's feature usage rows: the entitlement display block plus
   * usage facts, one per entitlement. Token required.
   */
  featureUsage(): Resource<CompanyFeatureUsageResponseData[]> {
    this._requireCustomer("featureUsage");
    return this._resource(
      "featureUsage",
      async () =>
        (await this._requireCustomer("featureUsage").getCompanyFeatureUsage())
          .data.rows,
      this._options.initialData?.featureUsage,
    );
  }

  /**
   * The company's invoice history, server-filtered, as pages: the resource
   * holds every page loaded so far and fetchMoreInvoices() appends the next
   * one. Paging is limit/offset underneath; the extra row requested past
   * the page boundary is what tells hasMore. Token required.
   */
  invoices(params?: ListInvoicesParams): Resource<InvoicePage> {
    this._requireCustomer("invoices");
    const key = invoicesKey(params);
    const pageSize = params?.limit ?? DEFAULT_INVOICE_PAGE_SIZE;
    return this._resource(
      key,
      async () => {
        const pages = this._invoicePages.get(key) ?? 1;
        const wanted = pageSize * pages;
        const rows = (
          await this._requireCustomer("invoices").listCompanyInvoices({
            includePending: params?.includePending,
            limit: wanted + 1,
            offset: 0,
          })
        ).data;
        return { hasMore: rows.length > wanted, rows: rows.slice(0, wanted) };
      },
      isDefaultInvoiceParams(params)
        ? this._options.initialData?.invoices
        : undefined,
    );
  }

  /**
   * Loads the next page of invoice history into the matching resource. A
   * failed load leaves the page count where it was, so the next attempt
   * asks for the same page rather than skipping one.
   */
  async fetchMoreInvoices(params?: ListInvoicesParams): Promise<void> {
    const resource = this.invoices(params);
    const key = invoicesKey(params);
    const pages = this._invoicePages.get(key) ?? 1;
    this._invoicePages.set(key, pages + 1);
    await resource.refetch();
    if (resource.getSnapshot().error !== undefined) {
      this._invoicePages.set(key, pages);
    }
  }

  /**
   * The company's upcoming invoice with balance math applied, or null when
   * there is nothing upcoming (no subscription — the API reports that as a
   * 404, which is an empty state here, not an error). Token required.
   */
  upcomingInvoice(): Resource<CompanyUpcomingInvoiceResponseData | null> {
    this._requireCustomer("upcomingInvoice");
    return this._resource(
      "upcomingInvoice",
      async () => {
        try {
          return (
            await this._requireCustomer(
              "upcomingInvoice",
            ).getCompanyUpcomingInvoice()
          ).data;
        } catch (err) {
          if (isResponseError(err) && err.response.status === 404) {
            return null;
          }
          throw err;
        }
      },
      this._options.initialData?.upcomingInvoice,
    );
  }

  /** Marks every held resource stale and refetches the subscribed ones. */
  invalidateAll(): void {
    for (const resource of this._resources.values()) {
      void resource.invalidate();
    }
  }

  /**
   * Swaps the access token. Company-scoped resources reset (a different
   * token may be a different company); the anonymous catalog is untouched
   * unless the credential mode changed.
   */
  setAccessToken(accessToken: AccessTokenInput | undefined): void {
    const previous = this._options.accessToken;
    // The same credential again is a no-op, so callers (e.g. a React
    // provider effect) can re-apply their prop without nuking caches.
    if (Object.is(previous, accessToken)) {
      return;
    }

    this._options.accessToken = accessToken;

    // A new provider FUNCTION is assumed to be the same session — inline
    // props get a fresh identity every render, and a function's identity
    // says nothing about which company it authenticates. The source swaps
    // (so the latest closure is used) but the cached token and all
    // resources stay. When the same provider now serves a DIFFERENT
    // company (e.g. the user switched workspaces), call resetSession().
    if (
      typeof previous === "function" &&
      typeof accessToken === "function" &&
      this._tokens !== undefined
    ) {
      this._tokens.setSource(accessToken, { preserveToken: true });
      return;
    }

    if (accessToken !== undefined && this._tokens !== undefined) {
      this._tokens.setSource(accessToken);
    } else {
      this._build();
    }
    this._resetAllResources();
  }

  /**
   * Signals that the authenticated session changed behind an unchanged
   * credential source (the user logged in as a different company while the
   * app kept the same token-provider function): drops the cached token and
   * resets every resource.
   */
  resetSession(): void {
    const source = this._options.accessToken;
    if (source !== undefined && this._tokens !== undefined) {
      this._tokens.setSource(source);
    }
    this._resetAllResources();
  }

  /**
   * Resets every resource — the company-scoped ones AND the catalog, which
   * in company mode carries per-company decoration (current plan, trial
   * eligibility) that must not survive a session change. Subscribed
   * resources refetch immediately; unwatched ones wait for their next
   * ensure().
   */
  private _resetAllResources(): void {
    this._invoicePages.clear();
    // Prefetched data described the previous session; a resource created
    // after the change must start empty rather than seeded with it.
    this._options.initialData = undefined;
    for (const resource of this._resources.values()) {
      resource.reset();
    }
    for (const listener of this._configListeners) {
      listener();
    }
  }

  private _build(): void {
    const { accessToken, apiUrl, fetchApi, headers, publishableKey } =
      this._options;
    const shared = {
      ...(apiUrl !== undefined ? { basePath: apiUrl } : {}),
      ...(fetchApi !== undefined ? { fetchApi } : {}),
      headers: {
        "X-Schematic-Client-Version": `schematic-js@${version}`,
        ...headers,
      },
    };

    this._publicApi =
      publishableKey !== undefined
        ? new CatalogsApi(
            new PublicConfiguration({ ...shared, apiKey: publishableKey }),
          )
        : undefined;

    if (accessToken !== undefined) {
      const tokens = new AccessTokenManager(accessToken);
      this._tokens = tokens;
      this._customerApi = new CheckoutexternalApi(
        new CustomerConfiguration({
          ...shared,
          apiKey: () => tokens.getToken(),
          middleware: [retryOnUnauthorized(tokens, fetchApi ?? fetch)],
        }),
      );
    } else {
      this._tokens = undefined;
      this._customerApi = undefined;
    }
  }

  private _requireCustomer(what: string): CheckoutexternalApi {
    if (this._customerApi === undefined) {
      throw new Error(
        `${what} requires an accessToken; only a publishableKey is configured`,
      );
    }
    return this._customerApi;
  }

  private _requirePublic(what: string): CatalogsApi {
    if (this._publicApi === undefined) {
      throw new Error(`${what} requires a publishableKey or an accessToken`);
    }
    return this._publicApi;
  }

  private _resource<T>(
    key: string,
    fetcher: () => Promise<T>,
    initial?: T,
  ): Resource<T> {
    const existing = this._resources.get(key);
    if (existing !== undefined) {
      return existing as Resource<T>;
    }
    const options: ResourceOptions<T> = {
      ...(initial !== undefined ? { initial } : {}),
      ...(this._options.staleTimeMs !== undefined
        ? { staleTimeMs: this._options.staleTimeMs }
        : {}),
    };
    const resource = new Resource<T>(async () => {
      try {
        return await fetcher();
      } catch (err) {
        throw await normalizeError(err);
      }
    }, options);
    this._resources.set(key, resource as Resource<unknown>);
    return resource;
  }
}

// Explicit defaults and omitted params are the same page, so they share a
// resource (and the prefetched seed).
const invoicesKey = (params?: ListInvoicesParams): string =>
  `invoices:${params?.includePending === true ? 1 : 0}:${params?.limit ?? DEFAULT_INVOICE_PAGE_SIZE}`;

const isDefaultInvoiceParams = (params?: ListInvoicesParams): boolean =>
  params?.includePending !== true &&
  (params?.limit === undefined || params.limit === DEFAULT_INVOICE_PAGE_SIZE);

/** Construction options for the one-shot fetch helpers below. */
export type CustomerFetchOptions = Omit<
  SchematicCustomerClientOptions,
  "initialData"
>;

// One-shot fetchers for server rendering (React Server Components,
// getServerSideProps) and scripts: each builds a throwaway client, resolves
// the resource once, and returns plain data that can be handed to the
// provider as initialData so the first client render is complete.

export const fetchCatalog = (
  options: CustomerFetchOptions & CatalogParams,
): Promise<CustomerCatalog> => {
  const { catalogId, mode, ...rest } = options;
  return new SchematicCustomerClient(rest)
    .catalog({
      ...(catalogId !== undefined ? { catalogId } : {}),
      ...(mode !== undefined ? { mode } : {}),
    })
    .load();
};

export const fetchCompany = (
  options: CustomerFetchOptions,
): Promise<CompanyContextResponseData> =>
  new SchematicCustomerClient(options).company().load();

export const fetchFeatureUsage = (
  options: CustomerFetchOptions,
): Promise<CompanyFeatureUsageResponseData[]> =>
  new SchematicCustomerClient(options).featureUsage().load();

export const fetchCreditBalances = (
  options: CustomerFetchOptions,
): Promise<CompanyCreditBalancesResponseData> =>
  new SchematicCustomerClient(options).creditBalances().load();

export const fetchInvoices = (
  options: CustomerFetchOptions & ListInvoicesParams,
): Promise<InvoicePage> => {
  const { includePending, limit, ...rest } = options;
  const params: ListInvoicesParams = {
    ...(includePending !== undefined ? { includePending } : {}),
    ...(limit !== undefined ? { limit } : {}),
  };
  return new SchematicCustomerClient(rest)
    .invoices(Object.keys(params).length > 0 ? params : undefined)
    .load();
};

export const fetchUpcomingInvoice = (
  options: CustomerFetchOptions,
): Promise<CompanyUpcomingInvoiceResponseData | null> =>
  new SchematicCustomerClient(options).upcomingInvoice().load();

/**
 * Retries a request exactly once with a freshly fetched token after a 401 —
 * the token likely expired between issuance and use. Static tokens can't
 * refresh, so their 401s pass through.
 */
const retryOnUnauthorized = (
  tokens: AccessTokenManager,
  rawFetch: typeof fetch,
): Middleware => ({
  post: async (context) => {
    if (context.response.status !== 401) {
      return undefined;
    }
    const sent = headersToRecord(context.init.headers);
    const sentToken = sent["X-Schematic-Api-Key"];
    if (!tokens.invalidate(sentToken)) {
      return undefined;
    }
    const token = await tokens.getToken();
    if (token === sentToken) {
      return undefined;
    }
    // The retry goes through the RAW fetch, not the middleware-wrapped one,
    // so a server that keeps returning 401 (revoked token, deleted grant)
    // cannot cause an unbounded refresh/retry loop.
    return rawFetch(context.url, {
      ...context.init,
      headers: { ...sent, "X-Schematic-Api-Key": token },
    });
  },
});

/** Normalizes RequestInit headers (plain object or Headers) to a record. */
const headersToRecord = (
  headers: RequestInit["headers"],
): Record<string, string> => {
  if (headers === undefined) {
    return {};
  }
  if (headers instanceof Headers) {
    const record: Record<string, string> = {};
    headers.forEach((value, key) => {
      record[key] = value;
    });
    return record;
  }
  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }
  return { ...headers };
};
