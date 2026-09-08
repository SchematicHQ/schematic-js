/**
 * `GET /company/invoices`. The wire shape is generated from the API's spec
 * by scripts/generate-company-api.sh and re-exported here under its domain
 * name; `InvoicePage` is a client construct built from the response.
 */

import type { CompanyInvoiceResponseData } from "../api/company/models";

export type { CompanyInvoiceResponseData };
export type Invoice = CompanyInvoiceResponseData;
export { InvoiceStatus } from "../api/company/models";

export interface InvoicePage {
  invoices: Invoice[];
  /** Matching the query on the server, not the number loaded here. */
  count: number;
  hasMore: boolean;
}

/** Each distinct query is its own row set with its own paging. */
export interface InvoiceQuery {
  /** Include unpaid invoices that are not yet due. Default false. */
  includePending?: boolean;
}

export const DEFAULT_INVOICE_QUERY: InvoiceQuery = {};

/**
 * The store keys a resource by the query's shape, so without this
 * `{ includePending: false }` is a different row set from `{}` — it would
 * miss the seed and refetch rows identical to those already on screen.
 */
export function normalizeInvoiceQuery(query: InvoiceQuery): InvoiceQuery {
  const { includePending, ...rest } = query;
  return includePending === true ? { ...rest, includePending: true } : rest;
}
