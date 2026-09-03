import type { CompanyClient } from "@schematichq/schematic-js";

import type {
  CompanyData,
  CompanyResourceName,
  CompanyResourceParams,
  CompanyResources,
  InvoicePage,
  InvoiceQuery,
  UpcomingInvoice,
} from "./contract";
import {
  DEFAULT_INVOICE_QUERY,
  SINGLETON,
  normalizeInvoiceQuery,
} from "./contract";
import { KeyedResource } from "./store";

export type {
  AccessToken,
  AccessTokenProvider,
  CompanyClient,
} from "@schematichq/schematic-js";
/**
 * Rows requested per invoices page. Deliberately a local copy rather than an
 * import of schematic-js's `INVOICE_PAGE_SIZE`: this package resolves that
 * one from a built bundle, and a runtime dependency on it for a constant
 * would tie every test run here to a fresh build there. `fetchCompanyData`
 * in schematic-js pages the same size from its own `INVOICE_PAGE_SIZE`; the
 * two have to move together.
 */
export const INVOICE_PAGE_SIZE = 12;

/**
 * The store for one session: a `KeyedResource` per company resource, built
 * over a `CompanyClient`. The session is the client's credential — the store
 * never sees a company or user id — and a credential change drops every
 * resource. This release carries the invoices and upcoming-invoice
 * resources; the others join them with their elements.
 */
export class CompanyStore {
  readonly invoices: KeyedResource<InvoicePage, InvoiceQuery>;
  readonly upcomingInvoice: KeyedResource<
    UpcomingInvoice | null,
    Record<string, never>
  >;
  private _unsubscribe: (() => void) | undefined;

  constructor(
    private readonly _client: CompanyClient,
    initialData: CompanyData = {},
    private readonly _pageSize = INVOICE_PAGE_SIZE,
  ) {
    // A refetch re-requests the loaded window, so a user who has paged
    // three deep does not collapse back to one page on invalidation.
    this.invoices = new KeyedResource((query, current) =>
      this._fetchInvoices(
        query,
        0,
        Math.max(this._pageSize, current?.invoices.length ?? 0),
      ),
    );
    this.upcomingInvoice = new KeyedResource(() =>
      this._client.fetchUpcomingInvoice(),
    );
    if (initialData.invoices !== undefined) {
      this.invoices.seed(DEFAULT_INVOICE_QUERY, initialData.invoices);
    }
    // `!== undefined`, not a truthiness check: `null` is a company with no
    // next bill, and seeding it is what spares the page a request whose
    // answer the prefetch already has.
    if (initialData.upcomingInvoice !== undefined) {
      this.upcomingInvoice.seed(SINGLETON, initialData.upcomingInvoice);
    }
  }

  /**
   * Listens for credential changes and returns the unsubscribe.
   *
   * Not done in the constructor: the provider arms it from an effect, and
   * React runs an effect, its cleanup, then the effect again under
   * StrictMode. A subscription made once at construction is torn down by
   * that cleanup and never comes back, leaving the store deaf to every
   * session change for the rest of the page.
   */
  connect(): () => void {
    this._unsubscribe?.();
    const unsubscribe = this._client.onCredentialsChange?.(() =>
      this.resetAll(),
    );
    this._unsubscribe = unsubscribe;
    return () => {
      unsubscribe?.();
      if (this._unsubscribe === unsubscribe) {
        this._unsubscribe = undefined;
      }
    };
  }

  /**
   * The family for one resource. The fields are named for their resource, so
   * `this[name]` is the right object; TypeScript widens it to a union of
   * every resource's family and cannot correlate that back to `K`, which is
   * what the cast bridges.
   */
  resource<K extends CompanyResourceName>(
    name: K,
  ): KeyedResource<CompanyResources[K], CompanyResourceParams[K]> {
    return this[name] as unknown as KeyedResource<
      CompanyResources[K],
      CompanyResourceParams[K]
    >;
  }

  /** Forgets every resource; subscribed ones reload, idle ones are dropped. */
  resetAll(): void {
    for (const name of RESOURCE_NAMES) {
      this[name].resetAll();
    }
  }

  /** Reloads every resource that has been loaded, keeping data on screen. */
  invalidateAll(): void {
    for (const name of RESOURCE_NAMES) {
      this[name].invalidateAll();
    }
  }

  /**
   * Appends the next page to the invoices list for `query`, when there is
   * one. The request reads as pending on the resource and a failure records
   * the error there, keeping the rows already fetched on screen; the
   * returned promise settles when the page does and never rejects.
   */
  loadMoreInvoices(query: InvoiceQuery = DEFAULT_INVOICE_QUERY): Promise<void> {
    // Normalized the way `useInvoices` normalizes: this is public API, and a
    // caller spelling out a default would otherwise address a second, never
    // loaded resource and page nothing while the list on screen stood still.
    const resource = this.invoices.get(normalizeInvoiceQuery(query));
    if (resource.snapshot.data?.hasMore !== true) {
      return Promise.resolve();
    }
    // Resource.extend owns the in-flight guard and drops a page whose entry
    // was reset or seeded while it was on the wire.
    return resource.extend(async (current) => {
      const page = await this._fetchInvoices(
        query,
        current.invoices.length,
        this._pageSize,
      );
      return {
        invoices: [...current.invoices, ...page.invoices],
        hasMore: page.hasMore,
      };
    });
  }

  dispose(): void {
    this._unsubscribe?.();
  }

  private async _fetchInvoices(
    query: InvoiceQuery,
    offset: number,
    limit: number,
  ): Promise<InvoicePage> {
    const rows = await this._client.fetchInvoices({
      ...query,
      limit: limit + 1,
      offset,
    });
    return {
      invoices: rows.slice(0, limit),
      hasMore: rows.length > limit,
    };
  }
}

export const RESOURCE_NAMES: readonly CompanyResourceName[] = [
  "invoices",
  "upcomingInvoice",
];
