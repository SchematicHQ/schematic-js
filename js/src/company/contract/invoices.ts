/**
 * `GET /company/invoices` — the wire shape is the generated model
 * (`CompanyInvoiceResponseData`, from the API's published spec via
 * scripts/generate-company-api.sh); the contract re-exports it under its
 * domain name. `InvoicePage` is a client-side construct: the endpoint
 * answers with the rows for the window and the number of invoices the query
 * matches in total, and the client turns the two into a page.
 */

import type { CompanyInvoiceResponseData } from "../api/company/models";

export type { CompanyInvoiceResponseData };
export type Invoice = CompanyInvoiceResponseData;
export { InvoiceStatus } from "../api/company/models";

/** The invoice history loaded so far, and how much of it there is. */
export interface InvoicePage {
  invoices: Invoice[];
  /**
   * Invoices matching the query on the server, not the number loaded here —
   * so a card showing four rows can say how many the company has.
   */
  count: number;
  /** Whether `count` exceeds the rows loaded: Invoices' "Load more". */
  hasMore: boolean;
}

/**
 * Selects which invoice rows the server returns. Each distinct query is its
 * own row set with its own paging, so the store keys the resource by it.
 */
export interface InvoiceQuery {
  /** Include unpaid invoices that are not yet due. Default false. */
  includePending?: boolean;
}

export const DEFAULT_INVOICE_QUERY: InvoiceQuery = {};

/**
 * Drops fields already at their default, so a query that states one keys the
 * same as one that leaves it out.
 *
 * The store keys a resource by the query's shape, and the prefetch seeds
 * under `DEFAULT_INVOICE_QUERY`. Without this, `{ includePending: false }`
 * is a different row set from `{}`: it would miss the seed and refetch rows
 * identical to the ones already on screen, and a page rendering both forms
 * would issue the same request twice.
 */
export function normalizeInvoiceQuery(query: InvoiceQuery): InvoiceQuery {
  const { includePending, ...rest } = query;
  return includePending === true ? { ...rest, includePending: true } : rest;
}
