/**
 * Scenario fixtures: complete `CompanyData` bags for the situations the
 * elements must handle. Each scenario is a function so IDs are deterministic
 * per build and fixtures never share mutable objects. This release carries
 * the invoices resource; scenarios regain the rest with their elements.
 */

import type { CompanyData } from "@schematichq/schematic-react";

import { daysFromNow, invoice, invoicePage } from "./builders";

/**
 * A paying company with history: two charges and a credit note on screen,
 * and a year of invoices behind them.
 */
export function proCompany(): CompanyData {
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
  };
}

/** A company still trialing: nothing invoiced yet. */
export function trialingCompany(): CompanyData {
  return { invoices: invoicePage([]) };
}

export const SCENARIOS = {
  pro: proCompany,
  trialing: trialingCompany,
} satisfies Record<string, () => CompanyData>;

export type ScenarioName = keyof typeof SCENARIOS;
