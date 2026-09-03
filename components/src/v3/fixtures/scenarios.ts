/**
 * Scenario fixtures: complete `CompanyData` bags for the situations the
 * elements must handle. Each scenario is a function so IDs are deterministic
 * per build and fixtures never share mutable objects. This release carries
 * the invoices and upcoming-invoice resources; scenarios regain the rest
 * with their elements.
 */

import type { CompanyData } from "@schematichq/schematic-react";

import {
  daysFromNow,
  discount,
  invoice,
  invoicePage,
  upcomingInvoice,
} from "./builders";

/**
 * A paying company with history: two charges and a credit note, more pages
 * behind, and a discounted next bill part-paid from account credit.
 */
export function proCompany(): CompanyData {
  return {
    upcomingInvoice: upcomingInvoice({
      subtotal: 8300,
      amountDue: 6800,
      customerBalanceApplied: 1500,
      customerBalanceRemaining: 0,
      discounts: [discount()],
    }),
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
    ),
  };
}

/** A company still trialing: nothing invoiced yet, and a first bill coming. */
export function trialingCompany(): CompanyData {
  return {
    invoices: invoicePage([]),
    upcomingInvoice: upcomingInvoice({ dueDate: daysFromNow(7) }),
  };
}

/**
 * A company with nothing to bill — cancelled, or never subscribed. `null` is
 * the server's answer, not a missing key, which is what the elements have to
 * tell apart from a resource that has not loaded.
 */
export function unbilledCompany(): CompanyData {
  return { invoices: invoicePage([]), upcomingInvoice: null };
}

export const SCENARIOS = {
  pro: proCompany,
  trialing: trialingCompany,
  unbilled: unbilledCompany,
} satisfies Record<string, () => CompanyData>;

export type ScenarioName = keyof typeof SCENARIOS;
