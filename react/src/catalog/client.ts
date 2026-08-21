import type { CatalogClient } from "@schematichq/schematic-js";

import type {
  AnyCatalog,
  CatalogData,
  CatalogResourceName,
  CatalogResources,
  CompanyContext,
  CreditBalanceEntry,
  FeatureUsageRow,
  InvoicePage,
  UpcomingInvoice,
} from "./contract";
import { Resource } from "./store";

export type {
  AccessToken,
  AccessTokenProvider,
  CatalogClient,
} from "@schematichq/schematic-js";

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
