/**
 * The company contract lives in schematic-js; re-exported here so the hooks
 * and components share one set of types. This release carries the invoices
 * and upcoming-invoice slices; the rest of the contract ships with its
 * elements.
 */
export {
  DEFAULT_INVOICE_QUERY,
  SINGLETON,
  normalizeInvoiceQuery,
  type CompanyData,
  type CompanyResourceName,
  type CompanyResourceParams,
  type CompanyResources,
  type Discount,
  type Invoice,
  type InvoicePage,
  type InvoiceQuery,
  type InvoiceStatus,
  type ResourceState,
  type UpcomingInvoice,
} from "@schematichq/schematic-js";
