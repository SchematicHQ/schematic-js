/**
 * Complete `BillingData` bags for the situations the elements must handle.
 * Each is a function so fixtures never share mutable objects across tests.
 */

import type {
  BillingData,
  FeatureUsage,
  PaymentMethod,
} from "@schematichq/schematic-react";

import {
  bankPaymentMethod,
  cardPaymentMethod,
  creditBalance,
  creditGrant,
  daysFromNow,
  discount,
  featureUsage,
  invoice,
  invoicePage,
  meteredPrice,
  perLicenseCreditGrant,
  upcomingInvoice,
  walletPaymentMethod,
} from "./builders";

/**
 * Three methods of three kinds, the card the default. Any of them can be
 * removed while the others exist, the default included, which is what the
 * server's `canRemove` says.
 */
export function paymentMethodSet(): PaymentMethod[] {
  return [
    cardPaymentMethod({
      id: "pm_card",
      externalId: "pm_card_ext",
      isDefault: true,
      canRemove: true,
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
 * promoted: the pill is empty and every row is among the others.
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

/**
 * One feature per way a company can be entitled: plan and override,
 * unpriced and each price behavior, a license with per-license credits, a
 * credit-burning feature, a boolean, and an unlimited allowance.
 */
export function featureUsageSet(): FeatureUsage[] {
  return [
    featureUsage({ featureId: "feat_api", featureName: "API call" }),
    featureUsage({
      featureId: "feat_seats",
      featureDescription: "People who can sign in",
      featureIcon: "stacks",
      featureName: "Seat",
      featureType: "trait",
      licenseId: "lic_seats",
      allocation: 12,
      valueNumeric: 12,
      usage: 9,
      priceBehavior: "pay_in_advance",
      price: meteredPrice({ price: 1500 }),
      currentCost: 18000,
      metricPeriod: undefined,
      metricPeriodMonthReset: undefined,
      resetsAt: undefined,
      perLicenseCreditGrants: [perLicenseCreditGrant()],
    }),
    featureUsage({
      featureId: "feat_storage",
      featureDescription: "Files kept in your workspace",
      featureIcon: "folder",
      featureName: "GB of storage",
      featureSingularName: "GB of storage",
      featurePluralName: "GB of storage",
      priceBehavior: "pay_as_you_go",
      allocation: undefined,
      valueNumeric: undefined,
      valueType: "unlimited",
      usage: 1300,
      price: meteredPrice({ price: 2, packageSize: 100 }),
      currentCost: 26,
    }),
    featureUsage({
      featureId: "feat_emails",
      featureDescription: "Messages sent to your customers",
      featureIcon: "paper-plane",
      featureName: "Email",
      priceBehavior: "overage",
      softLimit: 1000,
      usage: 1300,
      price: meteredPrice({
        price: 0,
        scheme: "tiered",
        tiersMode: "graduated",
        priceTiers: [
          { from: 0, to: 1000, perUnitPrice: 0 },
          { from: 1001, perUnitPrice: 5 },
        ],
      }),
      currentCost: 1500,
    }),
    featureUsage({
      featureId: "feat_builds",
      featureName: "Build",
      priceBehavior: "tier",
      allocation: 100,
      valueNumeric: 100,
      usage: 40,
      price: meteredPrice({
        price: 0,
        scheme: "tiered",
        tiersMode: "volume",
        priceTiers: [
          { from: 0, to: 50, perUnitPrice: 10 },
          { from: 51, perUnitPrice: 8, flatPrice: 500 },
        ],
      }),
      currentCost: 400,
    }),
    featureUsage({
      featureId: "feat_generations",
      featureName: "Generation",
      priceBehavior: "credit_burndown",
      allocation: undefined,
      valueType: "credit",
      usage: 120,
      consumptionRate: 2,
      creditId: "bcr_ai",
      creditName: "AI credit",
    }),
    featureUsage({
      featureId: "feat_exports",
      featureName: "Export",
      entitlementType: "company_override",
      companyOverrideId: "co_exports",
      planEntitlementId: undefined,
      allocation: 50,
      valueNumeric: 50,
      usage: 45,
      expiresAt: daysFromNow(30),
    }),
    featureUsage({
      featureId: "feat_sso",
      featureDescription: "Sign in with your identity provider",
      featureIcon: "key",
      featureName: "SSO",
      featureType: "boolean",
      allocation: undefined,
      valueNumeric: undefined,
      valueBool: true,
      valueType: "boolean",
      usage: undefined,
      metricPeriod: undefined,
      metricPeriodMonthReset: undefined,
      resetsAt: undefined,
    }),
  ];
}

export function featureUsageScenario(): BillingData {
  return { featureUsage: featureUsageSet() };
}

/**
 * AI credits with a plan grant, a bundle and a per-license composition; a
 * credit bought with four grants, so its ledger truncates; and a plan
 * credit held none of, as a zero balance with nothing to buy.
 */
export function creditsScenario(): BillingData {
  return {
    creditBalances: [
      creditBalance({
        creditId: "bcr_ai",
        composition: {
          fixedQuantity: 100,
          licenseId: "lic_seats",
          licenseName: "Seat",
          licenseQuantity: 12,
          perLicenseAmount: 10,
          period: "month",
          renewsAt: new Date("2026-09-01T12:00:00.000Z"),
          total: 220,
        },
      }),
      creditBalance({
        creditId: "bcr_export",
        creditIcon: undefined,
        creditName: "Export credit",
        grants: [
          creditGrant({ grantReason: "free", quantity: 5 }),
          creditGrant({ grantReason: "billing_credit_auto_topup" }),
          creditGrant({ grantReason: "purchased" }),
          creditGrant(),
        ],
        purchasable: false,
      }),
      creditBalance({
        creditId: "bcr_seat",
        creditDescription: "",
        creditIcon: undefined,
        creditName: "Seat credit",
        expiresAt: undefined,
        grants: [],
        purchasable: false,
        remaining: 0,
        resetsAt: undefined,
        total: 0,
        used: 0,
      }),
    ],
  };
}

/** Entitled to nothing: a loaded, empty list. */
export function featureUsageEmpty(): BillingData {
  return { featureUsage: [] };
}

export const SCENARIOS = {
  pro: proCompany,
  trialing: trialingCompany,
  unbilled: unbilledCompany,
  paymentMethods,
  paymentMethodsEmpty,
  paymentMethodsNoDefault,
  featureUsage: featureUsageScenario,
  featureUsageEmpty,
  credits: creditsScenario,
} satisfies Record<string, () => BillingData>;

export type ScenarioName = keyof typeof SCENARIOS;
