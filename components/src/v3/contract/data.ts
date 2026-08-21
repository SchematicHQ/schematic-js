/**
 * The resource boundary the elements read through. One resource per unit of
 * server state that can be stale independently of the others — the hook
 * granularity the elements need, and therefore the endpoint granularity the
 * contract proposes.
 */

import type { AnyCatalog } from "./catalog";
import type { CompanyContext } from "./company";
import type { CreditBalance } from "./credits";
import type { InvoicePage, UpcomingInvoice } from "./invoices";
import type { FeatureUsageRow } from "./usage";

/** Every resource reports through the same three-field status. */
export interface ResourceState<T> {
  /** `undefined` until the first successful load; retained across later errors. */
  data: T | undefined;
  /** The latest failure; cleared by the next success. */
  error: Error | undefined;
  /** A request is in flight and no data has arrived yet, or a refetch is running. */
  isPending: boolean;
}

/** Resource name → resolved type. The data seam is keyed by this map. */
export interface CatalogResources {
  /** `GET /public/catalog[s/:id]` or `GET /catalog/view` · `/catalogs/:id/view`. */
  catalog: AnyCatalog;
  /** `GET /company`. */
  company: CompanyContext;
  /** `GET /company/usage`. */
  usage: FeatureUsageRow[];
  /** `GET /company/credits`. */
  credits: CreditBalance[];
  /** `GET /company/invoices?limit&offset`. */
  invoices: InvoicePage;
  /** `GET /company/upcoming-invoice`; `null` when there is no subscription to invoice. */
  upcomingInvoice: UpcomingInvoice | null;
}

export type CatalogResourceName = keyof CatalogResources;

/**
 * Plain resolved data for every resource, as a server prefetch or a fixture
 * supplies it. Any key may be omitted; the seam reports it as pending.
 */
export type CatalogData = {
  [K in CatalogResourceName]?: CatalogResources[K];
};
