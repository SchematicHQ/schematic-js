/**
 * Checkout fixtures: a catalog as `GET /catalog/view` serves it, a company as
 * `GET /company` does, and a checkout as the `/checkouts` routes do. Typed
 * against the contract so a contract change breaks them at compile time.
 * Absent optionals are omitted rather than `null`, which is what the
 * generated `FromJSON` produces.
 */

import type {
  Catalog,
  CatalogAutoTopup,
  CatalogCheckoutField,
  CatalogCreditBundle,
  CatalogEntitlement,
  CatalogPlan,
  Checkout,
  CheckoutPriceSnapshot,
  CheckoutProblem,
  Company,
  CompanySubscription,
} from "@schematichq/schematic-react";

import type { CatalogPrice } from "../model/checkoutPrices";

import { NOW, daysFromNow, nextId } from "./builders";

/** A per-unit USD price billed monthly. */
export function catalogPrice(
  overrides: Partial<CatalogPrice> = {},
): CatalogPrice {
  return {
    currency: "usd",
    id: nextId("price"),
    interval: "month",
    intervalCount: 1,
    packageSize: 1,
    price: 1000,
    priceTiers: [],
    scheme: "per_unit",
    ...overrides,
  };
}

export const monthly = (price: number, currency = "usd"): CatalogPrice =>
  catalogPrice({ currency, price });

export const quarterly = (price: number, currency = "usd"): CatalogPrice =>
  catalogPrice({ currency, interval: "month", intervalCount: 3, price });

export const yearly = (price: number, currency = "usd"): CatalogPrice =>
  catalogPrice({ currency, interval: "year", price });

export const oneTime = (price: number, currency = "usd"): CatalogPrice =>
  catalogPrice({ currency, interval: "one-time", price });

/** A recurring plan sold monthly and yearly, valid for the company. */
export function catalogPlan(overrides: Partial<CatalogPlan> = {}): CatalogPlan {
  // `in`, not `??`: a test that leaves a period unpriced says so with an
  // explicit `undefined`.
  const monthlyPrice =
    "monthlyPrice" in overrides ? overrides.monthlyPrice : monthly(2500);
  const yearlyPrice =
    "yearlyPrice" in overrides ? overrides.yearlyPrice : yearly(25000);
  return {
    autoTopups: [],
    availablePeriods: [
      ...(monthlyPrice === undefined ? [] : (["monthly"] as const)),
      ...(overrides.quarterlyPrice === undefined
        ? []
        : (["quarterly"] as const)),
      ...(yearlyPrice === undefined ? [] : (["yearly"] as const)),
    ],
    billingStrategy: "provider_managed",
    chargeType: "recurring",
    companyCanTrial: false,
    currencyPrices: [],
    current: false,
    description: "",
    entitlements: [],
    icon: "",
    id: nextId("plan"),
    includedCreditGrants: [],
    isTrialable: false,
    monthlyPrice,
    name: "Pro",
    usageViolations: [],
    valid: true,
    yearlyPrice,
    ...overrides,
  };
}

/** A recurring add-on sold monthly and yearly, with every plan. */
export function catalogAddOn(
  overrides: Partial<CatalogPlan> = {},
): CatalogPlan {
  return catalogPlan({
    monthlyPrice: monthly(500),
    name: "Priority support",
    yearlyPrice: yearly(5000),
    id: nextId("addon"),
    ...overrides,
  });
}

/** Seats bought ahead at $5 a month or $50 a year. */
export function payInAdvanceEntitlement(
  overrides: Partial<CatalogEntitlement> = {},
): CatalogEntitlement {
  return {
    currencyPrices: [],
    featureDescription: "",
    featureIcon: "",
    featureId: nextId("feat"),
    featureName: "Seat",
    featurePluralName: "Seats",
    featureSingularName: "Seat",
    featureType: "trait",
    id: nextId("pe"),
    meteredMonthlyPrice: monthly(500),
    meteredYearlyPrice: yearly(5000),
    priceBehavior: "pay_in_advance",
    valueType: "numeric",
    ...overrides,
  };
}

/** 100 credits for $10, with every plan. */
export function creditBundle(
  overrides: Partial<CatalogCreditBundle> = {},
): CatalogCreditBundle {
  return {
    bundleType: "fixed",
    creditId: nextId("cred"),
    creditName: "Credit",
    creditPluralName: "Credits",
    creditSingularName: "Credit",
    currencyPrices: [],
    expiryType: "no_expiry",
    expiryUnit: "days",
    id: nextId("bundle"),
    name: "100 credits",
    price: oneTime(1000),
    quantity: 100,
    ...overrides,
  };
}

/** A top-up the company may choose: 500 credits when it falls below 100. */
export function autoTopup(
  overrides: Partial<CatalogAutoTopup> = {},
): CatalogAutoTopup {
  return {
    amount: 500,
    availability: "user_controlled",
    creditId: nextId("cred"),
    currencyPrices: [],
    enabled: true,
    planCreditGrantId: nextId("grant"),
    thresholdCredits: 100,
    unitPrice: catalogPrice({ interval: "one-time", price: 2 }),
    ...overrides,
  };
}

export function checkoutField(
  overrides: Partial<CatalogCheckoutField> = {},
): CatalogCheckoutField {
  return {
    id: nextId("cfc"),
    name: "PO Number",
    required: false,
    ...overrides,
  };
}

/** The environment's catalog, checkout on, collecting nothing extra. */
export function catalog(overrides: Partial<Catalog> = {}): Catalog {
  return {
    addOns: [],
    capabilities: { badgeVisibility: false, checkout: true },
    checkoutSettings: {
      bundlePurchaseBehavior: "quantity",
      collectAddress: false,
      collectEmail: false,
      collectPhone: false,
      collectTaxId: false,
      customFields: [],
      prorationBehavior: "invoice_immediately",
      taxCollectionEnabled: false,
    },
    creditBundles: [],
    customPlanCta: {},
    defaultCurrency: "usd",
    id: nextId("cat"),
    name: "Default",
    plans: [],
    preventSelfServiceDowngrade: false,
    ...overrides,
  } as Catalog;
}

/** An active monthly USD subscription. */
export function subscription(
  overrides: Partial<CompanySubscription> = {},
): CompanySubscription {
  return {
    cancelAtPeriodEnd: false,
    currency: "usd",
    currentPeriodEnd: daysFromNow(30),
    currentPeriodStart: NOW,
    id: nextId("bilsub"),
    interval: "month",
    intervalCount: 1,
    status: "active",
    totalPrice: 2500,
    trialing: false,
    ...overrides,
  };
}

/** A company on no plan, with no subscription. */
export function company(overrides: Partial<Company> = {}): Company {
  return {
    addOns: [],
    id: nextId("comp"),
    name: "Acme",
    ...overrides,
  };
}

/** The company as `GET /company` reports it on `plan` with a subscription. */
export function companyOn(
  plan: CatalogPlan,
  overrides: Partial<Company> = {},
): Company {
  return company({
    plan: {
      description: plan.description,
      icon: plan.icon,
      id: plan.id,
      isAddOn: false,
      isCustom: false,
      name: plan.name,
      price: plan.monthlyPrice,
    },
    subscription: subscription(),
    ...overrides,
  });
}

/** A priced snapshot: $25 due now and each month, a card required. */
export function priceSnapshot(
  overrides: Partial<CheckoutPriceSnapshot> = {},
): CheckoutPriceSnapshot {
  return {
    amountOff: 0,
    currency: "usd",
    discountAmount: 0,
    discounts: [],
    dueNow: 2500,
    isScheduledDowngrade: false,
    newCharges: 2500,
    optInRequired: false,
    paymentMethodRequired: true,
    percentOff: 0,
    periodStart: NOW,
    pricedAt: NOW,
    promoCodeApplied: false,
    proration: 0,
    totalPerBillingPeriod: 2500,
    ...overrides,
  };
}

export function problem(
  overrides: Partial<CheckoutProblem> = {},
): CheckoutProblem {
  return {
    blocking: true,
    code: "payment_method_required",
    message: "Add a payment method to complete this checkout.",
    source: "requirement",
    ...overrides,
  };
}

/** An open checkout priced at `priceSnapshot()`. */
export function checkoutDraft(overrides: Partial<Checkout> = {}): Checkout {
  return {
    companyId: "comp_1",
    createdAt: NOW,
    id: nextId("chk"),
    lastActivityAt: NOW,
    priceSnapshot: priceSnapshot(),
    pricedAt: NOW,
    problems: [],
    selections: {
      addOnIds: [],
      autoTopupOverrides: [],
      creditBundles: [],
      customFieldValues: [],
      intent: "change",
      payInAdvance: [],
      skipTrial: false,
    },
    status: "open",
    updatedAt: NOW,
    version: 1,
    ...overrides,
  } as Checkout;
}
