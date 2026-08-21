import type {
  AnyCatalog,
  CatalogData,
  CatalogResourceName,
  CatalogResources,
  CompanyContext,
  CreditBalanceEntry,
  FeatureUsageRow,
  Invoice,
  InvoicePage,
  UpcomingInvoice,
} from "./contract";
import { Resource } from "./store";

/**
 * What the provider needs from a catalog API client. schematic-js implements
 * it against the catalog + company endpoints; tests and server-rendered
 * pages supply fakes or prefetched data.
 */
export interface CatalogClient {
  /** The public catalog, or the company's view when an access token is held. */
  fetchCatalog(): Promise<AnyCatalog>;
  fetchCompany(): Promise<CompanyContext>;
  fetchFeatureUsage(): Promise<FeatureUsageRow[]>;
  fetchCreditBalances(): Promise<CreditBalanceEntry[]>;
  /** One page of invoice history; the store asks for `limit + 1` rows to learn `hasMore`. */
  fetchInvoices(params: { limit: number; offset: number }): Promise<Invoice[]>;
  /** `null` when there is no subscription to invoice. */
  fetchUpcomingInvoice(): Promise<UpcomingInvoice | null>;
  /**
   * Called when the credentials the client fetches with change (a new access
   * token, a different company). The store resets every resource.
   */
  onCredentialsChange?(listener: () => void): () => void;
  /** Installs or clears the access token; the provider forwards its prop here. */
  setAccessToken?(token: AccessToken | undefined): void;
}

/**
 * An access token as a string, or an async provider the client calls (and
 * re-calls after a 401) — the shape schematic-js accepts.
 */
export type AccessTokenProvider = () => Promise<
  string | { token: string; expiresAt?: Date }
>;
export type AccessToken = string | AccessTokenProvider;

/** Rows requested per invoices page. */
export const INVOICE_PAGE_SIZE = 12;

/**
 * One `Resource` per catalog resource, built over a `CatalogClient`, with
 * the invoices resource aware of paging.
 */
export class CatalogStore {
  readonly catalog: Resource<AnyCatalog>;
  readonly company: Resource<CompanyContext>;
  readonly usage: Resource<FeatureUsageRow[]>;
  readonly credits: Resource<CreditBalanceEntry[]>;
  readonly invoices: Resource<InvoicePage>;
  readonly upcomingInvoice: Resource<UpcomingInvoice | null>;
  private _loadingMore = false;
  private _unsubscribe: (() => void) | undefined;

  constructor(
    private readonly _client: CatalogClient,
    initialData: CatalogData = {},
    private readonly _pageSize = INVOICE_PAGE_SIZE,
  ) {
    this.catalog = new Resource(
      () => _client.fetchCatalog(),
      initialData.catalog,
    );
    this.company = new Resource(
      () => _client.fetchCompany(),
      initialData.company,
    );
    this.usage = new Resource(
      () => _client.fetchFeatureUsage(),
      initialData.usage,
    );
    this.credits = new Resource(
      () => _client.fetchCreditBalances(),
      initialData.credits,
    );
    this.invoices = new Resource(
      () => this._fetchPage(0),
      initialData.invoices,
    );
    this.upcomingInvoice = new Resource(
      () => _client.fetchUpcomingInvoice(),
      initialData.upcomingInvoice,
    );
    this._unsubscribe = _client.onCredentialsChange?.(() => this.resetAll());
  }

  resource<K extends CatalogResourceName>(
    name: K,
  ): Resource<CatalogResources[K]> {
    return this[name] as Resource<CatalogResources[K]>;
  }

  /** Forgets every resource; subscribed ones reload. */
  resetAll(): void {
    for (const name of RESOURCE_NAMES) {
      this[name].reset();
    }
  }

  /** Reloads every resource that has been loaded, keeping data on screen. */
  invalidateAll(): void {
    for (const name of RESOURCE_NAMES) {
      const resource = this[name];
      if (resource.snapshot.data !== undefined) {
        void resource.refetch();
      }
    }
  }

  /** Appends the next invoices page when there is one. */
  async loadMoreInvoices(): Promise<void> {
    const current = this.invoices.snapshot.data;
    if (current === undefined || !current.hasMore || this._loadingMore) {
      return;
    }
    this._loadingMore = true;
    try {
      const page = await this._fetchPage(current.invoices.length);
      this.invoices.update((data) => ({
        invoices: [...data.invoices, ...page.invoices],
        hasMore: page.hasMore,
      }));
    } finally {
      this._loadingMore = false;
    }
  }

  dispose(): void {
    this._unsubscribe?.();
  }

  private async _fetchPage(offset: number): Promise<InvoicePage> {
    const rows = await this._client.fetchInvoices({
      limit: this._pageSize + 1,
      offset,
    });
    return {
      invoices: rows.slice(0, this._pageSize),
      hasMore: rows.length > this._pageSize,
    };
  }
}

export const RESOURCE_NAMES: readonly CatalogResourceName[] = [
  "catalog",
  "company",
  "usage",
  "credits",
  "invoices",
  "upcomingInvoice",
];
