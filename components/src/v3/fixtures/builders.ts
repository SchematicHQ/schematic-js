/**
 * Fixture builders: every contract type with sensible defaults, overridable
 * per call. Typed against the contract, so a contract change breaks the
 * fixtures at compile time — the fixtures are the first consumer of every
 * field. This release carries the invoices slice.
 */

import type {
  Discount,
  Invoice,
  InvoicePage,
  UpcomingInvoice,
} from "@schematichq/schematic-react";

let counter = 0;
/** Deterministic IDs: `${prefix}_1`, `${prefix}_2`, … in call order. */
export const nextId = (prefix: string): string => `${prefix}_${++counter}`;

export const resetIds = (): void => {
  counter = 0;
};

export const NOW = new Date("2026-08-21T12:00:00.000Z");
export const daysFromNow = (days: number): Date =>
  new Date(NOW.getTime() + days * 24 * 60 * 60 * 1000);

export function invoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: nextId("inv"),
    amountDue: 1000,
    currency: "usd",
    status: "paid",
    dueDate: daysFromNow(-10),
    createdAt: daysFromNow(-11),
    url: "https://invoice.example/inv",
    ...overrides,
  };
}

export function invoicePage(invoices: Invoice[], hasMore = false): InvoicePage {
  return { invoices, hasMore };
}

/**
 * A 20%-off coupon repeating for three months.
 *
 * Absent optionals are left out rather than set to `null`, because that is
 * what a decoded response looks like: the generated `FromJSON` maps a wire
 * null to `undefined`. The derivations normalize either to `null`, so a
 * test may still pass one explicitly.
 */
export function discount(overrides: Partial<Discount> = {}): Discount {
  return {
    couponName: "Launch",
    customerFacingCode: "LAUNCH20",
    percentOff: 20,
    duration: "repeating",
    durationInMonths: 3,
    ...overrides,
  };
}

export function upcomingInvoice(
  overrides: Partial<UpcomingInvoice> = {},
): UpcomingInvoice {
  return {
    amountDue: 6800,
    currency: "usd",
    customerBalanceApplied: 0,
    customerBalanceRemaining: 0,
    discounts: [],
    dueDate: daysFromNow(14),
    subtotal: 6800,
    ...overrides,
  };
}
