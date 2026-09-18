/**
 * Complete `BillingData` bags for the situations the elements must handle.
 * Each is a function so fixtures never share mutable objects across tests.
 */

import type { BillingData, PaymentMethod } from "@schematichq/schematic-react";

import {
  bankPaymentMethod,
  cardPaymentMethod,
  daysFromNow,
  discount,
  invoice,
  invoicePage,
  upcomingInvoice,
  walletPaymentMethod,
} from "./builders";

/**
 * Three methods of three kinds, the card the default. The default cannot be
 * removed while the others exist, which is what the server's `canRemove`
 * says.
 */
export function paymentMethodSet(): PaymentMethod[] {
  return [
    cardPaymentMethod({
      id: "pm_card",
      externalId: "pm_card_ext",
      isDefault: true,
      canRemove: false,
    }),
    bankPaymentMethod({ id: "pm_bank", externalId: "pm_bank_ext" }),
    walletPaymentMethod({ id: "pm_link", externalId: "pm_link_ext" }),
  ];
}

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
    paymentMethods: paymentMethodSet(),
  };
}

/** A company still trialing: nothing invoiced yet, first bill in a week. */
export function trialingCompany(): BillingData {
  return {
    invoices: invoicePage([]),
    upcomingInvoice: upcomingInvoice({ dueDate: daysFromNow(7) }),
    paymentMethods: [
      cardPaymentMethod({
        id: "pm_card",
        externalId: "pm_card_ext",
        isDefault: true,
        // The last method stays on an active subscription.
        canRemove: false,
      }),
    ],
  };
}

/**
 * A company with no subscription. `null` is the server's answer, not a
 * missing key, which is what the elements have to tell apart from a
 * resource that has not loaded.
 */
export function unbilledCompany(): BillingData {
  return {
    invoices: invoicePage([]),
    upcomingInvoice: null,
    paymentMethods: [],
  };
}

/** The pro company's methods on their own: a default card, a bank, a wallet. */
export function paymentMethods(): BillingData {
  return { paymentMethods: paymentMethodSet() };
}

/** Nothing on file: a 200 with an empty list, never a 404. */
export function paymentMethodsEmpty(): BillingData {
  return { paymentMethods: [] };
}

/**
 * Methods with no default among them, which a provider allows. Nothing is
 * promoted: every row offers Make default and none wears the badge.
 */
export function paymentMethodsNoDefault(): BillingData {
  return {
    paymentMethods: paymentMethodSet().map((method) => ({
      ...method,
      isDefault: false,
      canRemove: true,
    })),
  };
}

export const SCENARIOS = {
  pro: proCompany,
  trialing: trialingCompany,
  unbilled: unbilledCompany,
  paymentMethods,
  paymentMethodsEmpty,
  paymentMethodsNoDefault,
} satisfies Record<string, () => BillingData>;

export type ScenarioName = keyof typeof SCENARIOS;
