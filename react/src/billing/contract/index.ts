/**
 * The billing contract lives in schematic-js. This package serves the slice
 * of it that has hooks here, and names that slice below rather than taking
 * the whole contract: schematic-js may already describe a resource or a
 * client method this release does not read, and typing the store by the
 * whole would make each addition there a compile error here, so that taking
 * a newer schematic-js meant adopting whatever it added. A resource joins
 * this list with the hook that reads it.
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
  type BillingData,
  type Invoice,
  type InvoicePage,
  type InvoiceQuery,
  type ResourceState,
} from "@schematichq/schematic-js";

/** The resources this package serves; a key of schematic-js's contract. */
export type BillingResourceName = "invoices";
export type BillingResources = Pick<ContractResources, BillingResourceName>;
export type BillingResourceParams = Pick<
  ContractResourceParams,
  BillingResourceName
>;

/**
 * What the store asks of a client: the session it reads under, and the
 * fetch behind each resource above. schematic-js's `SchematicBillingClient`
 * satisfies it, and so does a host's own client that implements only this
 * much.
 */
export type BillingClient = Pick<
  ContractClient,
  | "sessionStatus"
  | "sessionKey"
  | "setSession"
  | "onSessionChange"
  | "fetchInvoices"
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
