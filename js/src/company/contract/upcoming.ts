/**
 * `GET /company/upcoming-invoice` — the wire shape is the generated model
 * (`CompanyUpcomingInvoiceResponseData`, from the API's published spec via
 * scripts/generate-company-api.sh); the contract re-exports it under its
 * domain name.
 *
 * The server has already done the two things a consumer would otherwise
 * get wrong: the customer-balance arithmetic (provider balances are
 * negative when the customer holds credit, and a previewed invoice reports
 * no ending balance), and dropping discounts that have expired or reduce
 * the bill by nothing.
 */

import type {
  CompanyDiscountResponseData,
  CompanyUpcomingInvoiceResponseData,
} from "../api/company/models";

export type { CompanyDiscountResponseData, CompanyUpcomingInvoiceResponseData };
export type UpcomingInvoice = CompanyUpcomingInvoiceResponseData;
export type Discount = CompanyDiscountResponseData;
