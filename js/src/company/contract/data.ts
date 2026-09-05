/**
 * The resource boundary the elements read through. One resource per unit of
 * server state that can be stale independently of the others — the hook
 * granularity the elements need, and therefore the endpoint granularity the
 * contract proposes. This release carries the invoices resource; the others
 * (catalog, company, usage, credits, upcomingInvoice) ship with their
 * elements.
 */

import type { InvoicePage, InvoiceQuery } from "./invoices";

/** Every resource reports through the same three-field status. */
export interface ResourceState<T> {
  /** `undefined` until the first successful load; retained across later errors. */
  data: T | undefined;
  /** The latest failure; cleared by the next success. */
  error: Error | undefined;
  /** A request is in flight and no data has arrived yet, or a refetch is running. */
  isPending: boolean;
}

/**
 * Session identity. A `CompanyStore` holds the data of exactly one session,
 * and a session is identified by its access token — never by a company or
 * user id in the store. Tokens are issued per company today; users and
 * companies are many-to-many, and a future token may name a
 * (company, user) pair. Either way the rule is the same: nothing in the
 * store, the hooks, or the resource keys is addressed by company or user,
 * so a token change on any axis is a full reset. Data that spans companies
 * for one user is a different token per company and lives outside a store.
 */

/** Resource name → resolved type. The data seam is keyed by this map. */
export interface CompanyResources {
  /** `GET /company/invoices?limit&offset&include_pending`. */
  invoices: InvoicePage;
}

/**
 * Resource name → the parameters that select a distinct row set. A resource
 * with `Record<string, never>` here is a singleton; anything else is keyed,
 * with one `Resource` per parameter set in the store.
 */
export interface CompanyResourceParams {
  invoices: InvoiceQuery;
}

export type CompanyResourceName = keyof CompanyResources;

/**
 * Plain resolved data for every resource, as a server prefetch or a fixture
 * supplies it. Any key may be omitted; the seam reports it as pending. Keyed
 * resources are seeded under their default parameters.
 */
export type CompanyData = {
  [K in CompanyResourceName]?: CompanyResources[K];
};
