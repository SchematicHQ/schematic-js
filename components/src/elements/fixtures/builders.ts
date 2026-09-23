/**
 * Fixture builders with sensible defaults, overridable per call. Typed
 * against the contract so a contract change breaks them at compile time.
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

/** `count` is the size of the whole history, not of the rows given. */
export function invoicePage(
  invoices: Invoice[],
  hasMore = false,
  count = hasMore ? invoices.length + 1 : invoices.length,
): InvoicePage {
  return { invoices, count, hasMore };
}

/**
 * A 20% coupon that repeats for three months. Absent optionals are omitted
 * rather than `null`, which is what the generated `FromJSON` produces.
 */
export function discount(overrides: Partial<Discount> = {}): Discount {
  return {
    couponName: "Launch",
    customerFacingCode: "LAUNCH20",
    duration: "repeating",
    durationInMonths: 3,
    percentOff: 20,
    ...overrides,
  };
}

/** A next bill with no balance and no discounts, due in two weeks. */
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
