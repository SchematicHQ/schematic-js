/**
 * The billing contract lives in schematic-js. This package serves the slice
 * of it that has hooks here, and names that slice below rather than taking
 * the whole contract: schematic-js may already describe a resource or a
 * client method this release does not read, and typing the store by the
 * whole would make each addition there a compile error here, so that taking
 * a newer schematic-js meant adopting whatever it added. A resource joins
 * this list with the hook that reads it. The invoices, upcoming-invoice and
 * payment-methods slices so far; the rest of the contract ships with its
 * elements.
 */
import { normalizeInvoiceQuery as normalize } from "@schematichq/schematic-js";

import type {
  BillingClient as ContractClient,
  BillingResourceParams as ContractResourceParams,
  BillingResources as ContractResources,
  InvoiceQuery,
} from "@schematichq/schematic-js";

export {
  DEFAULT_INVOICE_QUERY,
  InvoiceStatus,
  SINGLETON,
  type BillingData,
  type Invoice,
  type InvoicePage,
  type Discount,
  type InvoiceQuery,
  type PaymentMethod,
  type ResourceState,
  type SetupIntent,
  type UpcomingInvoice,
} from "@schematichq/schematic-js";

/** The resources this package serves; a key of schematic-js's contract. */
export type BillingResourceName =
  "invoices" | "upcomingInvoice" | "paymentMethods";
export type BillingResources = Pick<ContractResources, BillingResourceName>;
export type BillingResourceParams = Pick<
  ContractResourceParams,
  BillingResourceName
>;

/**
 * What `BillingProvider` asks of its client: the session it reads under, the
 * fetch behind each resource above, and the payment-method actions the hooks
 * expose. schematic-js's `SchematicBillingClient`
 * satisfies it, and so does a host's own client that implements only this
 * much. Named apart from schematic-js's `BillingClient`, which is the whole
 * interface; this is the part the hooks here call.
 */
export type BillingProviderClient = Pick<
  ContractClient,
  | "sessionStatus"
  | "sessionKey"
  | "setSession"
  | "onSessionChange"
  | "fetchInvoices"
  | "fetchUpcomingInvoice"
  | "fetchPaymentMethods"
  | "createSetupIntent"
  | "updatePaymentMethod"
  | "deletePaymentMethod"
>;

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
