/**
 * `GET /company/upcoming-invoice`. The wire shape is generated from the
 * API's spec by scripts/generate-billing-api.sh and re-exported here under
 * its domain name.
 *
 * Two things the server has already done, so a consumer never re-derives a
 * provider's conventions: the customer-balance arithmetic (a provider
 * reports held credit as a negative starting balance, and a previewed
 * invoice carries no ending balance), and dropping discounts that have
 * ended or take nothing off.
 */

import type {
  CompanyDiscountResponseData,
  CompanyUpcomingInvoiceResponseData,
} from "../api/generated/models";

export type { CompanyDiscountResponseData, CompanyUpcomingInvoiceResponseData };
export type UpcomingInvoice = CompanyUpcomingInvoiceResponseData;
export type Discount = CompanyDiscountResponseData;
