import {
  INVOICE_MAX_PAGE_SIZE,
  INVOICE_PAGE_SIZE,
  type CompanyClient,
} from "@schematichq/schematic-js";

import type {
  CompanyData,
  CompanyResourceName,
  CompanyResourceParams,
  CompanyResources,
  Invoice,
  InvoicePage,
  InvoiceQuery,
} from "./contract";
import { DEFAULT_INVOICE_QUERY, normalizeInvoiceQuery } from "./contract";
import { KeyedResource } from "./store";

export type {
  AccessToken,
  AccessTokenProvider,
  CompanyClient,
} from "@schematichq/schematic-js";
/**
 * Rows requested per invoices page, re-exported from schematic-js: this
 * package already depends on that one at runtime, and a page size the two
 * could disagree on is a page size that eventually does.
 */
export { INVOICE_PAGE_SIZE };

/**
 * The store for one session: a `KeyedResource` per company resource, built
 * over a `CompanyClient`. The session is the client's credential — the store
 * never sees a company or user id — and a credential change drops every
 * resource. This release carries the invoices resource; the others join it
 * with their elements.
 */
export class CompanyStore {
  readonly invoices: KeyedResource<InvoicePage, InvoiceQuery>;
  private _unsubscribe: (() => void) | undefined;

  constructor(
    private readonly _client: CompanyClient,
    initialData: CompanyData = {},
    private readonly _pageSize = INVOICE_PAGE_SIZE,
  ) {
    // A refetch re-requests the loaded window, so a user who has paged
    // three deep does not collapse back to one page on invalidation.
    this.invoices = new KeyedResource(
      (query, current) =>
        this._reloadWindow(
          query,
          Math.max(this._pageSize, current?.invoices.length ?? 0),
        ),
      // Asked before every fetch, by an element mounting long after the
      // session ended as much as by one on screen when it did: there is
      // nothing to read for, and the reader is owed a blank card rather than
      // the client's refusal rendered as an error.
      { canLoad: () => this._client.sessionEnded !== true },
    );
    if (initialData.invoices !== undefined) {
      this.invoices.seed(DEFAULT_INVOICE_QUERY, initialData.invoices);
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

  resource<K extends CompanyResourceName>(
    name: K,
  ): KeyedResource<CompanyResources[K], CompanyResourceParams[K]> {
    return this[name] as KeyedResource<
      CompanyResources[K],
      CompanyResourceParams[K]
    >;
  }

  /**
   * Forgets every resource; subscribed ones reload, idle ones are dropped.
   * Unless the session has ended, where there is nothing to reload for and
   * an empty card is the answer — a reader who signed out is not owed an
   * error about it.
   */
  resetAll(): void {
    const ended = this._client.sessionEnded === true;
    for (const name of RESOURCE_NAMES) {
      if (ended) {
        this[name].clearAll();
      } else {
        this[name].resetAll();
      }
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
        // Normalized, like the key the resource is stored under: a query
        // spelling out a default would otherwise fetch a different row set
        // than the list it appends to.
        normalizeInvoiceQuery(query),
        current.invoices.length,
        this._pageSize,
      );
      const invoices = [...current.invoices, ...page.invoices];
      return {
        invoices,
        count: page.count,
        // From the count the page came back with, not the one the list was
        // built on: an invoice finalized between the two requests changes
        // what is left to load. A page that came back empty ends the list
        // whatever the count says — the rows and the count are two queries,
        // and a count that outruns the rows would otherwise leave "Load
        // more" on screen, fetching nothing, for as long as anyone clicks.
        hasMore: page.invoices.length > 0 && invoices.length < page.count,
      };
    });
  }

  dispose(): void {
    this._unsubscribe?.();
  }

  /**
   * Re-reads the rows already on screen, in as many requests as the API's
   * page cap needs. A reader who has paged past that cap still gets their
   * whole window back: asking for it in one request would be a 400, and
   * asking for only the first 250 would make the rest vanish from the table.
   */
  private async _reloadWindow(
    query: InvoiceQuery,
    window: number,
  ): Promise<InvoicePage> {
    const invoices: Invoice[] = [];
    let count = 0;
    while (invoices.length < window) {
      const page = await this._fetchInvoices(
        query,
        invoices.length,
        Math.min(INVOICE_MAX_PAGE_SIZE, window - invoices.length),
      );
      count = page.count;
      invoices.push(...page.invoices);
      // A history that shrank under the reader ends the walk; without this
      // an empty page would leave the loop asking for the same offset.
      if (page.invoices.length === 0 || invoices.length >= count) {
        break;
      }
    }

    return {
      invoices,
      count,
      hasMore: invoices.length > 0 && invoices.length < count,
    };
  }

  private async _fetchInvoices(
    query: InvoiceQuery,
    offset: number,
    limit: number,
  ): Promise<InvoicePage> {
    const page = await this._client.fetchInvoices({ ...query, limit, offset });
    return {
      invoices: page.invoices,
      count: page.count,
      // No rows means no more of them, whatever the count reports.
      hasMore:
        page.invoices.length > 0 && offset + page.invoices.length < page.count,
    };
  }
}

export const RESOURCE_NAMES: readonly CompanyResourceName[] = ["invoices"];
