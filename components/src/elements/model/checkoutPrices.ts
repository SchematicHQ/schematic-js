import type {
  CatalogCreditBundle,
  CatalogEntitlement,
  CatalogPlan,
} from "@schematichq/schematic-react";

/**
 * Which price in a catalog a cart means. The catalog prices a plan once per
 * billing period and currency, a pay-in-advance entitlement the same way, and
 * a credit bundle once per currency; these find the one a cart selects, and
 * never substitute another period's or another currency's.
 */

/** A billing period a subscription renews on. */
export type CheckoutPeriod = "month" | "quarter" | "year";

/** The periods, shortest first. */
export const CHECKOUT_PERIODS: readonly CheckoutPeriod[] = [
  "month",
  "quarter",
  "year",
];

export type CatalogPrice = NonNullable<CatalogPlan["monthlyPrice"]>;

type PlanSlot = "monthlyPrice" | "quarterlyPrice" | "yearlyPrice";
type MeteredSlot =
  "meteredMonthlyPrice" | "meteredQuarterlyPrice" | "meteredYearlyPrice";

const PLAN_SLOT: Record<CheckoutPeriod, PlanSlot> = {
  month: "monthlyPrice",
  quarter: "quarterlyPrice",
  year: "yearlyPrice",
};

const METERED_SLOT: Record<CheckoutPeriod, MeteredSlot> = {
  month: "meteredMonthlyPrice",
  quarter: "meteredQuarterlyPrice",
  year: "meteredYearlyPrice",
};

const CADENCE: Record<string, CheckoutPeriod> = {
  monthly: "month",
  quarterly: "quarter",
  yearly: "year",
};

const sameCurrency = (a: string | undefined, b: string): boolean =>
  a !== undefined && a.toLowerCase() === b.toLowerCase();

/**
 * The billing period of a price or a subscription, or `undefined` for one that
 * does not renew.
 */
export function periodOfPrice(price: {
  interval: string;
  intervalCount: number;
}): CheckoutPeriod | undefined {
  if (price.interval === "year") {
    return "year";
  }
  if (price.interval === "month") {
    return price.intervalCount === 3 ? "quarter" : "month";
  }
  return undefined;
}

/** A plan or add-on sold once rather than on a subscription. */
export function isOneTime(plan: CatalogPlan): boolean {
  return plan.chargeType === "one_time";
}

/** A plan with nothing to charge. */
export function isFree(plan: CatalogPlan): boolean {
  return plan.chargeType === "free" || plan.chargeType === "none";
}

/** The periods a plan is sold on, shortest first. */
export function planPeriods(plan: CatalogPlan): CheckoutPeriod[] {
  const offered = new Set(
    plan.availablePeriods
      .map((cadence) => CADENCE[cadence])
      .filter((period): period is CheckoutPeriod => period !== undefined),
  );
  return CHECKOUT_PERIODS.filter((period) => offered.has(period));
}

/**
 * The plan's price for the period in the currency. A one-time plan has one
 * price, whatever the period.
 */
export function planPrice(
  plan: CatalogPlan,
  period: CheckoutPeriod,
  currency: string,
): CatalogPrice | undefined {
  const top = isOneTime(plan) ? plan.oneTimePrice : plan[PLAN_SLOT[period]];
  if (top !== undefined && sameCurrency(top.currency, currency)) {
    return top;
  }
  const inCurrency = plan.currencyPrices.find((cp) =>
    sameCurrency(cp.currency, currency),
  );
  if (inCurrency === undefined) {
    return undefined;
  }
  return isOneTime(plan)
    ? inCurrency.oneTimePrice
    : inCurrency[PLAN_SLOT[period]];
}

/** Every currency the plan is priced in, lowercase. */
export function planCurrencies(plan: CatalogPlan): string[] {
  const currencies = new Set<string>();
  for (const price of [
    plan.monthlyPrice,
    plan.quarterlyPrice,
    plan.yearlyPrice,
    plan.oneTimePrice,
  ]) {
    if (price !== undefined) {
      currencies.add(price.currency.toLowerCase());
    }
  }
  for (const cp of plan.currencyPrices) {
    currencies.add(cp.currency.toLowerCase());
  }
  return [...currencies];
}

/** Bought ahead in a quantity the customer picks, rather than billed on use. */
export function isPayInAdvance(entitlement: CatalogEntitlement): boolean {
  return entitlement.priceBehavior === "pay_in_advance";
}

/** A pay-in-advance entitlement's per-unit price for the period in the currency. */
export function entitlementPrice(
  entitlement: CatalogEntitlement,
  period: CheckoutPeriod,
  currency: string,
): CatalogPrice | undefined {
  const top = entitlement[METERED_SLOT[period]];
  if (top !== undefined && sameCurrency(top.currency, currency)) {
    return top;
  }
  return entitlement.currencyPrices.find((cp) =>
    sameCurrency(cp.currency, currency),
  )?.[PLAN_SLOT[period]];
}

/**
 * A credit bundle's price in the currency: per purchase for a bundle of a set
 * size, per credit for one bought in a quantity the customer picks.
 */
export function bundlePrice(
  bundle: CatalogCreditBundle,
  currency: string,
): CatalogPrice | undefined {
  const top = bundle.quantity == null ? bundle.unitPrice : bundle.price;
  if (top !== undefined && sameCurrency(top.currency, currency)) {
    return top;
  }
  const inCurrency = bundle.currencyPrices.find((cp) =>
    sameCurrency(cp.currency, currency),
  );
  return bundle.quantity == null ? inCurrency?.unitPrice : inCurrency?.price;
}

/**
 * Whether an add-on or bundle may be bought alongside the plan. An absent
 * list is every plan, and an empty one none.
 */
export function compatibleWith(
  compatiblePlanIds: string[] | null | undefined,
  planId: string | undefined,
): boolean {
  if (compatiblePlanIds == null) {
    return true;
  }
  return planId !== undefined && compatiblePlanIds.includes(planId);
}
