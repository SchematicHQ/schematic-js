/**
 * Fixture builders with sensible defaults, overridable per call. Typed
 * against the contract so a contract change breaks them at compile time.
 */

import type {
  Discount,
  FeatureUsage,
  FeatureUserUsage,
  Invoice,
  InvoicePage,
  MeteredPrice,
  PaymentMethod,
  PerLicenseCreditGrant,
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
