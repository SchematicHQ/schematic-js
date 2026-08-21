/**
 * Fixture builders: every contract type with sensible defaults, overridable
 * per call. Typed against the contract, so a contract change breaks the
 * fixtures at compile time — the fixtures are the first consumer of every
 * field.
 */

import type {
  AutoTopupAvailability,
  Catalog,
  CatalogPlan,
  CheckoutBehavior,
  CompanyCatalog,
  CompanyCatalogPlan,
  CompanyContext,
  CompanyPlan,
  CreditAutoTopup,
  CreditBalanceEntry,
  CreditBundle,
  CreditGrant,
  CreditGrantRow,
  CreditRef,
  CustomBilling,
  Discount,
  Entitlement,
  EntitlementCredit,
  FeatureRef,
  FeatureUsageRow,
  Invoice,
  InvoicePage,
  Price,
  PriceTier,
  ScheduledDowngrade,
  Subscription,
  UpcomingInvoice,
} from "@schematichq/schematic-react";

let counter = 0;
/** Deterministic IDs: `${prefix}_1`, `${prefix}_2`, … in call order. */
export const nextId = (prefix: string): string => `${prefix}_${++counter}`;
/** Resets the ID sequence so a scenario builds the same IDs every run. */
export const resetIds = (): void => {
  counter = 0;
};

/** Fixed "now" for fixtures: 2026-08-21T12:00:00Z. Dates are relative to it. */
export const NOW = new Date("2026-08-21T12:00:00.000Z");
export const daysFromNow = (days: number): Date =>
  new Date(NOW.getTime() + days * 86_400_000);

export function price(overrides: Partial<Price> = {}): Price {
  return {
    id: nextId("price"),
    currency: "usd",
    interval: "month",
    intervalCount: 1,
    amount: 1000,
    amountDecimal: null,
    packageSize: 1,
    scheme: "per_unit",
    tiersMode: null,
    tiers: [],
    ...overrides,
  };
}

export const monthly = (amount: number, currency = "usd"): Price =>
  price({ amount, currency, interval: "month", intervalCount: 1 });
export const quarterly = (amount: number, currency = "usd"): Price =>
  price({ amount, currency, interval: "month", intervalCount: 3 });
export const yearly = (amount: number, currency = "usd"): Price =>
  price({ amount, currency, interval: "year", intervalCount: 1 });
export const oneTime = (amount: number, currency = "usd"): Price =>
  price({ amount, currency, interval: "one-time", intervalCount: 1 });

/** The same price under a fixed ID, for scenarios that reference it. */
export const withId = (p: Price, id: string): Price => ({ ...p, id });

export function tier(overrides: Partial<PriceTier> = {}): PriceTier {
  return {
    from: 1,
    to: null,
    perUnitAmount: 100,
    perUnitAmountDecimal: null,
    flatAmount: null,
    ...overrides,
  };
}

/** A graduated tiered price: `bands` as [upTo | null, perUnitAmount][]. */
export function tieredPrice(
  bands: [number | null, number][],
  overrides: Partial<Price> = {},
): Price {
  let from = 1;
  const tiers = bands.map(([to, perUnitAmount]) => {
    const band = tier({ from, to, perUnitAmount });
    from = to === null ? from : to + 1;
    return band;
  });
  return price({
    amount: 0,
    scheme: "tiered",
    tiersMode: "graduated",
    tiers,
    ...overrides,
  });
}

export function feature(overrides: Partial<FeatureRef> = {}): FeatureRef {
  const id = overrides.id ?? nextId("feat");
  return {
    id,
    name: "Feature",
    singularName: null,
    pluralName: null,
    icon: null,
    description: null,
    type: "boolean",
    ...overrides,
  };
}

export function creditRef(overrides: Partial<CreditRef> = {}): CreditRef {
  return {
    id: nextId("credit"),
    name: "Credits",
    singularName: "credit",
    pluralName: "credits",
    icon: "coins",
    ...overrides,
  };
}

export function entitlementCredit(
  overrides: Partial<EntitlementCredit> = {},
): EntitlementCredit {
  return {
    ...creditRef(),
    consumptionRate: 1,
    equivalentLimit: null,
    ...overrides,
  };
}

export function entitlement(overrides: Partial<Entitlement> = {}): Entitlement {
  return {
    id: nextId("ent"),
    feature: feature(),
    valueType: "boolean",
    valueBool: true,
    valueNumeric: null,
    priceBehavior: null,
    meteredPrices: [],
    softLimit: null,
    credit: null,
    metricPeriod: null,
    metricPeriodMonthReset: null,
    warningThreshold: null,
    ...overrides,
  };
}

/** A boolean "included" feature. */
export const booleanEntitlement = (
  name: string,
  overrides: Partial<Entitlement> = {},
): Entitlement =>
  entitlement({
    feature: feature({ name, type: "boolean" }),
    valueType: "boolean",
    valueBool: true,
    ...overrides,
  });

/** A numeric event feature with a per-period limit. */
export const numericEntitlement = (
  name: string,
  limit: number,
  overrides: Partial<Entitlement> = {},
): Entitlement =>
  entitlement({
    feature: feature({ name, type: "event" }),
    valueType: "numeric",
    valueBool: null,
    valueNumeric: limit,
    metricPeriod: "current_month",
    metricPeriodMonthReset: "first_of_month",
    ...overrides,
  });

export const unlimitedEntitlement = (
  name: string,
  overrides: Partial<Entitlement> = {},
): Entitlement =>
  entitlement({
    feature: feature({ name, type: "event" }),
    valueType: "unlimited",
    valueBool: null,
    ...overrides,
  });

export function creditGrant(overrides: Partial<CreditGrant> = {}): CreditGrant {
  return {
    id: nextId("grant"),
    credit: creditRef(),
    amount: 100,
    companyAmount: 100,
    scaling: "fixed",
    licenseId: null,
    resetCadence: "monthly",
    ...overrides,
  };
}

export function plan(overrides: Partial<CatalogPlan> = {}): CatalogPlan {
  return {
    id: nextId("plan"),
    name: "Plan",
    description: "",
    icon: "",
    chargeType: "recurring",
    prices: [monthly(1000), yearly(10000)],
    entitlements: [],
    isTrialable: false,
    trialDays: null,
    compatiblePlanIds: null,
    includedCreditGrants: [],
    ...overrides,
  };
}

export const freePlan = (overrides: Partial<CatalogPlan> = {}): CatalogPlan =>
  plan({ name: "Free", chargeType: "free", prices: [], ...overrides });

export function companyPlan(
  overrides: Partial<CompanyCatalogPlan> = {},
): CompanyCatalogPlan {
  return {
    ...plan(overrides),
    current: false,
    currentPriceId: null,
    valid: true,
    invalidReason: null,
    companyCanTrial: false,
    usageViolations: [],
    ...overrides,
  };
}

export function creditBundle(
  overrides: Partial<CreditBundle> = {},
): CreditBundle {
  const credit = overrides.credit ?? creditRef();
  return {
    id: nextId("bundle"),
    name: `${credit.name} pack`,
    credit,
    quantity: 500,
    prices: [oneTime(2500)],
    unitPrices: [],
    compatiblePlanIds: null,
    expiry: { type: "no_expiry", unit: "days", unitCount: null },
    ...overrides,
  };
}

export function catalog(overrides: Partial<Catalog> = {}): Catalog {
  return {
    id: nextId("catalog"),
    name: "Default catalog",
    description: null,
    pricingUrl: null,
    customPlanCta: null,
    capabilities: { checkout: true },
    defaultCurrency: "usd",
    plans: [],
    addOns: [],
    creditBundles: [],
    ...overrides,
  };
}

export function checkoutBehavior(
  overrides: Partial<CheckoutBehavior> = {},
): CheckoutBehavior {
  return {
    preventSelfServiceDowngrade: false,
    preventSelfServiceDowngradeButtonText: null,
    preventSelfServiceDowngradeUrl: null,
    trialExpiryPlan: null,
    trialPaymentMethodRequired: null,
    ...overrides,
  };
}

export function companyCatalog(
  overrides: Partial<CompanyCatalog> = {},
): CompanyCatalog {
  const base = catalog();
  return {
    ...base,
    plans: [],
    addOns: [],
    checkoutBehavior: checkoutBehavior(),
    ...overrides,
  };
}

export function heldPlan(overrides: Partial<CompanyPlan> = {}): CompanyPlan {
  return {
    id: nextId("plan"),
    catalogId: null,
    name: "Plan",
    description: "",
    icon: "",
    isAddOn: false,
    isCustom: false,
    price: monthly(1000),
    quantity: null,
    ...overrides,
  };
}

export function subscription(
  overrides: Partial<Subscription> = {},
): Subscription {
  return {
    id: nextId("sub"),
    status: "active",
    currency: "usd",
    interval: "month",
    intervalCount: 1,
    totalAmount: 1000,
    currentPeriodStart: daysFromNow(-10),
    currentPeriodEnd: daysFromNow(20),
    trialing: false,
    trialEnd: null,
    cancelAt: null,
    cancelAtPeriodEnd: false,
    ...overrides,
  };
}

export function customBilling(
  overrides: Partial<CustomBilling> = {},
): CustomBilling {
  return {
    id: nextId("cpb"),
    planId: "plan_custom",
    status: "pending",
    activationStrategy: "on_payment",
    billingCycleAnchor: null,
    daysUntilDue: 30,
    invoiceUrl: "https://invoice.example/pay",
    paidAt: null,
    publishedAt: daysFromNow(-1),
    sendInvoice: true,
    ...overrides,
  };
}

export function scheduledDowngrade(
  overrides: Partial<ScheduledDowngrade> = {},
): ScheduledDowngrade {
  return {
    plan: { id: "plan_basic", name: "Basic" },
    effectiveAt: daysFromNow(20),
    currency: "usd",
    amount: 1000,
    ...overrides,
  };
}

export function creditAutoTopup(
  overrides: Partial<CreditAutoTopup> = {},
): CreditAutoTopup {
  return {
    creditId: "credit_1",
    availability: "user_controlled" as AutoTopupAvailability,
    selfService: true,
    enabled: true,
    thresholdCredits: 50,
    amount: 500,
    ...overrides,
  };
}

export function company(
  overrides: Partial<CompanyContext> = {},
): CompanyContext {
  return {
    id: nextId("comp"),
    name: "Acme",
    plan: null,
    addOns: [],
    subscription: null,
    customBilling: null,
    scheduledDowngrade: null,
    creditAutoTopups: [],
    ...overrides,
  };
}

export function usageRow(
  overrides: Partial<FeatureUsageRow> = {},
): FeatureUsageRow {
  const base = entitlement();
  return {
    feature: base.feature,
    valueType: base.valueType,
    valueBool: base.valueBool,
    valueNumeric: base.valueNumeric,
    priceBehavior: base.priceBehavior,
    meteredPrices: base.meteredPrices,
    softLimit: base.softLimit,
    credit: base.credit,
    metricPeriod: base.metricPeriod,
    metricPeriodMonthReset: base.metricPeriodMonthReset,
    warningThreshold: base.warningThreshold,
    source: "plan",
    planEntitlementId: base.id,
    companyOverrideId: null,
    access: true,
    usage: 0,
    effectiveLimit: null,
    percentUsed: null,
    resetsAt: null,
    expiresAt: null,
    currentCost: null,
    currentCostCurrency: null,
    ...overrides,
  };
}

/** A usage row built from a plan entitlement plus usage facts. */
export function usageOf(
  ent: Entitlement,
  facts: Partial<FeatureUsageRow> = {},
): FeatureUsageRow {
  const { id, ...display } = ent;
  const effectiveLimit =
    facts.effectiveLimit !== undefined
      ? facts.effectiveLimit
      : display.valueType === "numeric"
        ? display.valueNumeric
        : null;
  const usage = facts.usage ?? 0;
  return usageRow({
    ...display,
    planEntitlementId: id,
    effectiveLimit,
    usage,
    percentUsed:
      effectiveLimit !== null && effectiveLimit > 0
        ? (usage / effectiveLimit) * 100
        : null,
    resetsAt: display.metricPeriod === null ? null : daysFromNow(11),
    ...facts,
  });
}

export function creditGrantRow(
  overrides: Partial<CreditGrantRow> = {},
): CreditGrantRow {
  return {
    id: nextId("cg"),
    reason: "plan",
    plan: { id: "plan_pro", name: "Pro" },
    bundle: null,
    quantity: 100,
    quantityUsed: 40,
    quantityRemaining: 60,
    renewalPeriod: "monthly",
    createdAt: daysFromNow(-10),
    validFrom: daysFromNow(-10),
    expiresAt: daysFromNow(20),
    ...overrides,
  };
}

export function creditBalance(
  overrides: Partial<CreditBalanceEntry> = {},
): CreditBalanceEntry {
  const grants = overrides.grants ?? [creditGrantRow()];
  const total = grants.reduce((sum, g) => sum + g.quantity, 0);
  const used = grants.reduce((sum, g) => sum + g.quantityUsed, 0);
  return {
    credit: { ...creditRef(), description: "" },
    total,
    used,
    remaining: total - used,
    expiresAt: grants.find((g) => g.expiresAt !== null)?.expiresAt ?? null,
    grants,
    ...overrides,
  };
}

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

export function discount(overrides: Partial<Discount> = {}): Discount {
  return {
    couponName: "Launch",
    customerFacingCode: "LAUNCH20",
    percentOff: 20,
    amountOff: null,
    currency: null,
    duration: "repeating",
    durationInMonths: 3,
    ...overrides,
  };
}

export function upcomingInvoice(
  overrides: Partial<UpcomingInvoice> = {},
): UpcomingInvoice {
  return {
    amountDue: 1000,
    subtotal: 1000,
    currency: "usd",
    dueDate: daysFromNow(20),
    discounts: [],
    customerBalanceApplied: 0,
    customerBalanceRemaining: 0,
    ...overrides,
  };
}
