/**
 * `GET /company/invoices` and `GET /company/upcoming-invoice` — display
 * shapes with the filtering and balance math done server-side.
 */

import type { DiscountDuration, InvoiceStatus } from "./enums";

/** One row of the server-filtered invoice history (no $0, void, draft, uncollectible, or synthetic rows). */
export interface Invoice {
  id: string;
  /** Minor units; negative for a credit note. Invoices. */
  amountDue: number;
  /** Invoices. */
  currency: string;
  /** `null` when the provider row carries none. Invoices. */
  status: InvoiceStatus | null;
  /** Invoices: the displayed date when set. */
  dueDate: Date | null;
  /** Invoices: fallback date. */
  createdAt: Date;
  /** Hosted invoice URL; `null` = no link. Invoices. */
  url: string | null;
}

/**
 * A page of invoice history. The contract is `limit`/`offset` with no total
 * count; the client asks for one extra row to learn `hasMore`.
 */
export interface InvoicePage {
  invoices: Invoice[];
  /** Invoices: "Load more". */
  hasMore: boolean;
}

/** An active subscription discount. */
export interface Discount {
  /** UpcomingBill. */
  couponName: string;
  /** Promo code shown as a chip; `null` = none. UpcomingBill. */
  customerFacingCode: string | null;
  /** UpcomingBill: "20% off". */
  percentOff: number | null;
  /** Minor units; UpcomingBill: "$5.00 off". */
  amountOff: number | null;
  /** ISO 4217 of `amountOff`. UpcomingBill. */
  currency: string | null;
  /** UpcomingBill: "for 3 months". */
  duration: DiscountDuration;
  durationInMonths: number | null;
}

export interface UpcomingInvoice {
  /** Minor units after discounts and applied balance. UpcomingBill. */
  amountDue: number;
  /** Minor units before discounts. UpcomingBill. */
  subtotal: number;
  /** UpcomingBill. */
  currency: string;
  /** UpcomingBill header. */
  dueDate: Date | null;
  /** Active discounts only. UpcomingBill. */
  discounts: Discount[];
  /** Customer balance applied to this invoice, as a positive minor-unit amount. UpcomingBill. */
  customerBalanceApplied: number;
  /** Customer balance left after this invoice, as a positive minor-unit amount. UpcomingBill. */
  customerBalanceRemaining: number;
}
