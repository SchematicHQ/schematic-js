import {
  INVOICE_MAX_PAGE_SIZE,
  INVOICE_PAGE_SIZE,
  type BillingClient,
  type InvoicesResult,
  type SessionStatus,
} from "@schematichq/schematic-js";

import type {
  BillingData,
  BillingResourceName,
  BillingResourceParams,
  BillingResources,
  Invoice,
  InvoicePage,
  InvoiceQuery,
} from "./contract";
import { DEFAULT_INVOICE_QUERY, normalizeInvoiceQuery } from "./contract";
import { KeyedResource, type Readiness } from "./store";

/**
 * Whether a prefetch belongs to the session in hand.
 *
 * A stamp that names another session is the case worth catching: rows
 * outlive the render that fetched them — a cached page, a tab that switched
 * company — and `fetchBillingData` stamps them so this can tell. An
 * unstamped prefetch is taken at face value, because a host handing one over
 * beside a session is saying it belongs to that session, and refusing it
 * would make `initialData` useless to anyone who fetched their own rows.
 */
function seedBelongs(
  seedKey: string | undefined,
  client: BillingClient,
): boolean {
  if (client.sessionStatus === "ended") {
    return false;
  }
  if (client.sessionStatus === "pending") {
    return true;
  }

  return seedKey === undefined || seedKey === client.sessionKey;
}

const READINESS: Record<SessionStatus, Readiness> = {
  pending: "waiting",
  active: "ready",
  ended: "never",
};

export type {
  AccessToken,
  AccessTokenProvider,
  BillingClient,
  Session,
  SessionEvent,
  SessionInput,
  SessionStatus,
} from "@schematichq/schematic-js";
/**
 * Rows requested per invoices page, re-exported from schematic-js: this
 * package already depends on that one at runtime, and a page size the two
 * could disagree on is a page size that eventually does.
 */
export { INVOICE_PAGE_SIZE };

/**
 * The store for one session: a `KeyedResource` per billing resource, built
 * over a `BillingClient`. The session is the client's credential — the store
 * never sees a company or user id — and a credential change drops every
 * resource. This release carries the invoices resource; the others join it
 * with their elements.
 */
export class BillingStore {
  readonly invoices: KeyedResource<InvoicePage, InvoiceQuery>;
  private _unsubscribe: (() => void) | undefined;
  private _seeded = false;
  /** The session that prefetch was for, where it said. */
  private _seedKey: string | undefined;

  constructor(
    private readonly _client: BillingClient,
    initialData: BillingData = {},
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
      // A session still pending stays pending; one that has ended settles
      // empty rather than recording the client's refusal as an error.
      { readiness: () => READINESS[this._client.sessionStatus] },
    );
    if (
      initialData.invoices !== undefined &&
      seedBelongs(initialData.sessionKey, this._client)
    ) {
      // Normalized the way the hook normalizes, or the caller asking for
      // it fetches the same page again.
      this.invoices.seed(
        normalizeInvoiceQuery(
          initialData.params?.invoices ?? DEFAULT_INVOICE_QUERY,
        ),
        initialData.invoices,
      );
      this._seedKey = initialData.sessionKey;
      this._seeded = true;
    }
  }

  /**
   * Not done in the constructor: the provider arms it from an effect, and
   * React runs an effect, its cleanup, then the effect again under
   * StrictMode. A subscription made once at construction is torn down by
   * that cleanup and never comes back, leaving the store deaf to every
   * session change for the rest of the page.
   */
  connect(): () => void {
    this._unsubscribe?.();
    const unsubscribe = this._client.onSessionChange?.((event) => {
      if (event.type === "ended") {
        this.clearAll();
      } else if (event.type === "changed") {
        this.resetAll();
      } else if (this._seeded && !seedBelongs(this._seedKey, this._client)) {
        // The rows already loaded name another session — a cached page, or
        // a second tab that switched. They are not this one's to serve.
        this._seeded = false;
        this.resetAll();
      } else {
        this._seeded = false;
        this.resumeAll();
      }
    });
    this._unsubscribe = unsubscribe;
    return () => {
      unsubscribe?.();
      if (this._unsubscribe === unsubscribe) {
        this._unsubscribe = undefined;
      }
    };
  }

  resource<K extends BillingResourceName>(
    name: K,
  ): KeyedResource<BillingResources[K], BillingResourceParams[K]> {
    return this[name] as KeyedResource<
      BillingResources[K],
      BillingResourceParams[K]
    >;
  }

  /** Forgets every resource; subscribed ones reload, idle ones are dropped. */
  resetAll(): void {
    for (const name of RESOURCE_NAMES) {
      this[name].resetAll();
    }
  }

  /** Forgets every resource and leaves them empty; nothing reloads. */
  clearAll(): void {
    for (const name of RESOURCE_NAMES) {
      this[name].clearAll();
    }
  }

  /** Loads every resource that is subscribed and has nothing yet. */
  resumeAll(): void {
    for (const name of RESOURCE_NAMES) {
      this[name].resumeAll();
    }
  }

  /** Reloads every resource that has been loaded, keeping its current data. */
  invalidateAll(): void {
    for (const name of RESOURCE_NAMES) {
      this[name].invalidateAll();
    }
  }

  /**
   * Appends the next page to the invoices list for `query`, when there is
   * one. A failure records the error on the resource and keeps the rows
   * already fetched; the returned promise never rejects.
   */
  loadMoreInvoices(query: InvoiceQuery = DEFAULT_INVOICE_QUERY): Promise<void> {
    // Normalized the way `useInvoices` normalizes: this is public API, and a
    // caller spelling out a default would otherwise address a second, never
    // loaded resource and page nothing.
    const resource = this.invoices.get(normalizeInvoiceQuery(query));
    if (resource.snapshot.data?.hasMore !== true) {
      return Promise.resolve();
    }
    return resource.extend(async (current) => {
      const page = await this._fetchInvoices(
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
        // what is left to load. An empty page ends the list whatever the
        // count says — the rows and the count are two queries, and a count
        // that outruns the rows would otherwise leave `hasMore` true for
        // good, with every further page fetching nothing.
        hasMore: page.invoices.length > 0 && invoices.length < page.count,
      };
    });
  }

  dispose(): void {
    this._unsubscribe?.();
  }

  /**
   * Re-reads the window already loaded, in as many requests as the API's
   * page cap needs. A window paged past that cap still comes back whole:
   * asking for it in one request would be a 400, and asking for only the
   * first page would drop the rest.
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
      // A history that shrank mid-walk ends it; otherwise an empty page
      // would leave the loop asking for the same offset forever.
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

  /**
   * Returns what the server said and nothing more: whether there is more to
   * load depends on the whole window, which only the caller assembling it
   * knows — `_reloadWindow` across its requests, and `loadMoreInvoices`
   * across the rows already loaded.
   */
  private _fetchInvoices(
    query: InvoiceQuery,
    offset: number,
    limit: number,
  ): Promise<InvoicesResult> {
    return this._client.fetchInvoices({ ...query, limit, offset });
  }
}

export const RESOURCE_NAMES: readonly BillingResourceName[] = ["invoices"];
