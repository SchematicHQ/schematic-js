/**
 * Complete `BillingData` bags for the situations the elements must handle.
 * Each is a function so fixtures never share mutable objects across tests.
 */

import type { BillingData } from "@schematichq/schematic-react";

import {
  daysFromNow,
  discount,
  invoice,
  invoicePage,
  upcomingInvoice,
} from "./builders";

/**
 * A paying company with history: two charges and a credit note on screen,
 * and eleven more behind them. Its next bill spends the last of a stored
 * balance and carries a launch discount.
 */
export function proCompany(): BillingData {
  return {
    invoices: invoicePage(
      [
        invoice({
          id: "inv_3",
          amountDue: 6800,
          dueDate: daysFromNow(-10),
          createdAt: daysFromNow(-11),
        }),
        invoice({
          id: "inv_2",
          amountDue: 6800,
          dueDate: daysFromNow(-40),
          createdAt: daysFromNow(-41),
        }),
        invoice({
          id: "inv_1",
          amountDue: -1500,
          dueDate: daysFromNow(-70),
          createdAt: daysFromNow(-71),
          status: "paid",
        }),
      ],
      true,
      14,
    ),
    upcomingInvoice: upcomingInvoice({
      amountDue: 6800,
      subtotal: 8300,
      customerBalanceApplied: 1500,
      customerBalanceRemaining: 0,
      discounts: [discount()],
    }),
  };
}

/** A company still trialing: nothing invoiced yet, first bill in a week. */
export function trialingCompany(): BillingData {
  return {
    invoices: invoicePage([]),
    upcomingInvoice: upcomingInvoice({ dueDate: daysFromNow(7) }),
  };
}

/**
 * A company with no subscription. `null` is the server's answer, not a
 * missing key, which is what the elements have to tell apart from a
 * resource that has not loaded.
 */
export function unbilledCompany(): BillingData {
  return { invoices: invoicePage([]), upcomingInvoice: null };
}

export const SCENARIOS = {
  pro: proCompany,
  trialing: trialingCompany,
  unbilled: unbilledCompany,
} satisfies Record<string, () => BillingData>;

export type ScenarioName = keyof typeof SCENARIOS;
