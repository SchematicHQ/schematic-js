/**
 * `GET /company/invoices` — the wire shape is the generated model
 * (`CompanyInvoiceResponseData`, from the API's published spec via
 * scripts/generate-company-api.sh); the contract re-exports it under its
 * domain name. `InvoicePage` is a client-side construct: the endpoint's
 * contract is `limit`/`offset` with no total count, and the client asks for
 * one extra row to learn `hasMore`.
 */

import type { CompanyInvoiceResponseData } from "../api/company/models";

export type { CompanyInvoiceResponseData };
export type Invoice = CompanyInvoiceResponseData;
export { InvoiceStatus } from "../api/company/models";

/** A page of invoice history, assembled by the client from limit+1 fetches. */
export interface InvoicePage {
  invoices: Invoice[];
  /** Invoices: "Load more". */
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
