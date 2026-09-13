/**
 * The billing contract lives in schematic-js; re-exported here so the hooks
 * and components share one set of types. This release carries the invoices
 * slice; the rest of the contract ships with its elements.
 */
export {
  DEFAULT_INVOICE_QUERY,
  InvoiceStatus,
  normalizeInvoiceQuery,
  type BillingData,
  type BillingResourceName,
  type BillingResourceParams,
  type BillingResources,
  type Invoice,
  type InvoicePage,
  type InvoiceQuery,
  type ResourceState,
} from "@schematichq/schematic-js";
