/**
 * Fixture builders: every contract type with sensible defaults, overridable
 * per call. Typed against the contract, so a contract change breaks the
 * fixtures at compile time — the fixtures are the first consumer of every
 * field. This release carries the invoices slice.
 */

import type { Invoice, InvoicePage } from "@schematichq/schematic-react";

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

/**
 * A page of invoices. `count` defaults to the rows given — pass a larger one
 * for a company whose history runs past what is loaded, which is what
 * `hasMore` means.
 */
export function invoicePage(
  invoices: Invoice[],
  hasMore = false,
  count = hasMore ? invoices.length + 1 : invoices.length,
): InvoicePage {
  return { invoices, count, hasMore };
}
