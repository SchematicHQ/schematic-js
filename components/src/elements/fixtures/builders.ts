/**
 * Fixture builders with sensible defaults, overridable per call. Typed
 * against the contract so a contract change breaks them at compile time.
 */

import type {
  Catalog,
  CatalogEntitlement,
  CatalogPlan,
  Company,
  CompanyPlan,
  CompanySubscription,
  CreditBalanceEntry,
  CreditGrant,
  CreditUserUsage,
  Discount,
  FeatureUsage,
  FeatureUserUsage,
  Invoice,
  InvoicePage,
  MeteredPrice,
  PaymentMethod,
  PerLicenseCreditGrant,
  PublicCatalog,
  PublicCatalogPlan,
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

/**
 * A Visa good for a year past `NOW`, not the default. Absent optionals are
 * omitted rather than `null`, as for `discount`. The external id is what
 * the provider knows the method by, and what "Set default" is asked with.
 */
export function cardPaymentMethod(
  overrides: Partial<PaymentMethod> = {},
): PaymentMethod {
  const id = nextId("pm");
  return {
    id,
    externalId: `${id}_ext`,
    type: "card",
    isDefault: false,
    canRemove: true,
    cardBrand: "visa",
    cardLast4: "4444",
    cardExpMonth: 8,
    cardExpYear: 2027,
    ...overrides,
  };
}

/** A US bank account at Chase. */
export function bankPaymentMethod(
  overrides: Partial<PaymentMethod> = {},
): PaymentMethod {
  const id = nextId("pm");
  return {
    id,
    externalId: `${id}_ext`,
    type: "us_bank_account",
    isDefault: false,
    canRemove: true,
    bankName: "Chase",
    accountLast4: "6789",
    ...overrides,
  };
}

/** A Link wallet, told apart by the email behind it. */
export function walletPaymentMethod(
  overrides: Partial<PaymentMethod> = {},
): PaymentMethod {
  const id = nextId("pm");
  return {
    id,
    externalId: `${id}_ext`,
    type: "link",
    isDefault: false,
    canRemove: true,
    accountName: "jo@example.com",
    billingEmail: "jo@example.com",
    ...overrides,
  };
}

/**
 * An unpriced event feature on the plan: 1,000 API calls a month, 250 used,
 * resetting on the first. Absent optionals are omitted rather than `null`,
 * as for `discount`.
 */
export function featureUsage(
  overrides: Partial<FeatureUsage> = {},
): FeatureUsage {
  const featureId = nextId("feat");
  return {
    access: true,
    allocation: 1000,
    entitlementType: "plan_entitlement",
    featureDescription: "Requests to the public API",
    featureIcon: "code",
    featureId,
    featureName: "API call",
    featureType: "event",
    metricPeriod: "current_month",
    metricPeriodMonthReset: "first_of_month",
    perLicenseCreditGrants: [],
    planEntitlementId: `pe_${featureId}`,
    resetsAt: daysFromNow(11),
    usage: 250,
    valueNumeric: 1000,
    valueType: "numeric",
    ...overrides,
  };
}

/** A monthly USD price of one cent a unit, untiered. */
export function meteredPrice(
  overrides: Partial<MeteredPrice> = {},
): MeteredPrice {
  return {
    currency: "usd",
    id: nextId("bpp"),
    interval: "month",
    intervalCount: 1,
    packageSize: 1,
    price: 1,
    priceTiers: [],
    scheme: "per_unit",
    ...overrides,
  };
}

/** Ten credits for every license unit, reset monthly. */
export function perLicenseCreditGrant(
  overrides: Partial<PerLicenseCreditGrant> = {},
): PerLicenseCreditGrant {
  return {
    companyCreditAmount: 0,
    creditAmount: 10,
    creditId: nextId("bcr"),
    creditName: "AI credit",
    id: nextId("bpcg"),
    scaling: "per_license",
    visible: true,
    ...overrides,
  };
}

/**
 * Five named users, heaviest last so consumers must sort, plus unattributed
 * usage.
 */
export function featureUserUsage(
  overrides: Partial<FeatureUserUsage> = {},
): FeatureUserUsage {
  const users = [
    { name: "Eve", usage: 10 },
    { name: "Dan", usage: 20 },
    { name: "Cy", usage: 30 },
    { name: "Bo", usage: 40 },
    { name: "Ada", usage: 150 },
  ];
  return {
    count: users.length,
    endTime: daysFromNow(11),
    startTime: daysFromNow(-20),
    total: 260,
    unattributed: 10,
    users: users.map(({ name, usage }, index) => ({
      lastSeen: daysFromNow(-index),
      name,
      share: usage / 260,
      usage,
      userId: `user_${name.toLowerCase()}`,
    })),
    ...overrides,
  };
}

/** A plan grant of 500 that renews next month, 150 of it spent. */
export function creditGrant(overrides: Partial<CreditGrant> = {}): CreditGrant {
  return {
    createdAt: daysFromNow(-20),
    grantReason: "plan",
    id: nextId("bcg"),
    planId: "plan_pro",
    planName: "Pro",
    quantity: 500,
    quantityRemaining: 350,
    quantityUsed: 150,
    renewalPeriod: "monthly",
    resetsAt: daysFromNow(10),
    ...overrides,
  };
}

/**
 * AI credits: the plan's renewing grant and a purchased bundle, on offer to
 * buy more of. Absent optionals are omitted rather than `null`.
 */
export function creditBalance(
  overrides: Partial<CreditBalanceEntry> = {},
): CreditBalanceEntry {
  const grants = [
    creditGrant({
      bundleId: "bcb_pack",
      bundleName: "500 credit pack",
      createdAt: daysFromNow(-2),
      expiresAt: daysFromNow(60),
      grantReason: "purchased",
      planId: undefined,
      planName: undefined,
      quantityRemaining: 500,
      quantityUsed: 0,
      renewalPeriod: undefined,
      resetsAt: undefined,
    }),
    creditGrant(),
  ];
  return {
    creditDescription: "Spent running inference",
    creditIcon: "chip",
    creditId: nextId("bcr"),
    creditName: "AI credit",
    expiresAt: daysFromNow(60),
    grants,
    purchasable: true,
    remaining: 850.25,
    resetsAt: daysFromNow(10),
    total: 1000,
    used: 149.75,
    ...overrides,
  };
}

/** Three named users behind a credit, and consumption sent without a user. */
export function creditUserUsage(
  overrides: Partial<CreditUserUsage> = {},
): CreditUserUsage {
  return {
    count: 3,
    endTime: daysFromNow(10),
    startTime: daysFromNow(-20),
    total: 149.75,
    unattributed: 4.75,
    users: [
      { name: "Bo", share: 0.2, used: 30, userId: "user_bo" },
      { name: "Ada", share: 0.6, used: 90, userId: "user_ada" },
      { name: "Cy", share: 0.17, used: 25, userId: "user_cy" },
    ],
    ...overrides,
  };
}

/** The Pro plan at $29 a month. */
export function companyPlan(overrides: Partial<CompanyPlan> = {}): CompanyPlan {
  return {
    description: "For growing teams",
    id: nextId("plan"),
    includedCreditIds: [],
    name: "Pro",
    period: "month",
    price: 2900,
    ...overrides,
  };
}

/** An active monthly USD subscription that renews in ten days. */
export function companySubscription(
  overrides: Partial<CompanySubscription> = {},
): CompanySubscription {
  return {
    cancelAtPeriodEnd: false,
    currency: "usd",
    nextBillAt: daysFromNow(10),
    period: "month",
    periodEnd: daysFromNow(10),
    status: "active",
    ...overrides,
  };
}

/** Acme on Pro, with nothing pending. Absent optionals are omitted. */
export function company(overrides: Partial<Company> = {}): Company {
  return {
    addOns: [],
    id: nextId("comp"),
    name: "Acme",
    plan: companyPlan(),
    subscription: companySubscription(),
    ...overrides,
  };
}

type CatalogPrice = NonNullable<CatalogPlan["monthlyPrice"]>;
type CatalogCreditGrant = CatalogPlan["includedCreditGrants"][number];

/** A flat USD price per month, in minor units. */
export function catalogPrice(
  overrides: Partial<CatalogPrice> = {},
): CatalogPrice {
  return {
    currency: "usd",
    id: nextId("bilpp"),
    interval: "month",
    intervalCount: 1,
    packageSize: 1,
    price: 2900,
    priceTiers: [],
    scheme: "per_unit",
    ...overrides,
  };
}

/** 1,000 API calls a month, a numeric trait-free entitlement. */
export function catalogEntitlement(
  overrides: Partial<CatalogEntitlement> = {},
): CatalogEntitlement {
  return {
    currencyPrices: [],
    featureDescription: "",
    featureIcon: "server-search",
    featureId: nextId("feat"),
    featureName: "API call",
    featureType: "event",
    id: nextId("pltl"),
    metricPeriod: "current_month",
    valueNumeric: 1000,
    valueType: "numeric",
    ...overrides,
  };
}

/** 100 AI credits a month, shown on the card. */
export function catalogCreditGrant(
  overrides: Partial<CatalogCreditGrant> = {},
): CatalogCreditGrant {
  return {
    companyCreditAmount: 0,
    creditAmount: 100,
    creditId: nextId("bilcr"),
    creditName: "AI credit",
    id: nextId("bilpcg"),
    resetCadence: "monthly",
    scaling: "fixed",
    visible: true,
    ...overrides,
  };
}

/**
 * A recurring plan priced per month and year in USD from `monthly`, a year
 * at ten months. Pass `prices` for anything else.
 */
export function publicCatalogPlan(
  overrides: Partial<PublicCatalogPlan> & { monthly?: number } = {},
): PublicCatalogPlan {
  const { monthly = 2900, ...rest } = overrides;
  const monthlyPrice = catalogPrice({ price: monthly });
  const yearlyPrice = catalogPrice({ interval: "year", price: monthly * 10 });
  return {
    availablePeriods: ["monthly", "yearly"],
    billingStrategy: "provider_managed",
    chargeType: "recurring",
    currencyPrices: [{ currency: "usd", monthlyPrice, yearlyPrice }],
    description: "For growing teams",
    entitlements: [],
    icon: "yellow",
    id: nextId("plan"),
    includedCreditGrants: [],
    isTrialable: false,
    monthlyPrice,
    name: "Pro",
    yearlyPrice,
    ...rest,
  };
}

/** The same plan as the company sees it: valid, not current. */
export function catalogPlan(
  overrides: Partial<CatalogPlan> & { monthly?: number } = {},
): CatalogPlan {
  const { monthly, ...rest } = overrides;
  return {
    ...publicCatalogPlan({ monthly }),
    autoTopups: [],
    companyCanTrial: false,
    current: false,
    usageViolations: [],
    valid: true,
    ...rest,
  };
}

/** A USD catalog with nothing in it; nobody signed in. */
export function publicCatalog(
  overrides: Partial<PublicCatalog> = {},
): PublicCatalog {
  return {
    addOns: [],
    capabilities: { badgeVisibility: false, checkout: false },
    creditBundles: [],
    defaultCurrency: "usd",
    id: nextId("cat"),
    name: "Default",
    plans: [],
    ...overrides,
  };
}

/** The same catalog as a company that can check out sees it. */
export function companyCatalog(overrides: Partial<Catalog> = {}): Catalog {
  return {
    ...publicCatalog(),
    addOns: [],
    capabilities: { badgeVisibility: false, checkout: true },
    checkoutSettings: {
      bundlePurchaseBehavior: "individual",
      collectAddress: false,
      collectEmail: false,
      collectPhone: false,
      collectTaxId: false,
      customFields: [],
      prorationBehavior: "create_prorations",
      taxCollectionEnabled: false,
    },
    plans: [],
    preventSelfServiceDowngrade: false,
    ...overrides,
  };
}
