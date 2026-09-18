/**
 * The billing contract lives in schematic-js; re-exported here so the hooks
 * and components share one set of types. The invoices, upcoming-invoice and
 * payment-methods slices so far; the rest of the contract ships with its
 * elements.
 */
import { normalizeInvoiceQuery as normalize } from "@schematichq/schematic-js";

import type { InvoiceQuery } from "@schematichq/schematic-js";

export {
  DEFAULT_INVOICE_QUERY,
  InvoiceStatus,
  SINGLETON,
  type BillingData,
  type BillingResourceName,
  type BillingResourceParams,
  type BillingResources,
  type Invoice,
  type InvoicePage,
  type Discount,
  type InvoiceQuery,
  type PaymentMethod,
  type ResourceState,
  type SetupIntent,
  type UpcomingInvoice,
} from "@schematichq/schematic-js";

/**
 * Keeps only the fields the request reads. The store keys a row set by the
 * query's shape, so a field the API never sees would key a row set of its
 * own, and a varying one a row set per render. schematic-js's normalizer
 * passes unknown fields through; this export shadows it on purpose.
 */
export function normalizeInvoiceQuery(query: InvoiceQuery): InvoiceQuery {
  return normalize(query).includePending === true
    ? { includePending: true }
    : {};
}
