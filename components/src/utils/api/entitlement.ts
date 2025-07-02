import { type FeatureUsageResponseData } from "../../api/checkoutexternal";
import type { Entitlement } from "../../types";
import { getEntitlementCost } from "../../utils";

const PeriodName: Record<string, string | undefined> = {
  billing: "billing period",
  current_day: "day",
  current_month: "month",
  current_year: "year",
};

export function getMetricPeriodName(entitlement: Entitlement) {
  if (entitlement.feature?.featureType !== "event") {
    return;
  }

  let period: string | null | undefined;
  if ("metricPeriod" in entitlement) {
    period = entitlement.metricPeriod;
  } else if ("period" in entitlement) {
    period = entitlement.period;
  }

  const name = period ? PeriodName[period] : undefined;

  return name;
}

export function getUsageBasedEntitlement(
  entitlement: FeatureUsageResponseData,
  period?: string,
) {
  // billing price associated with the current period
  const billingPrice =
    period === "year"
      ? entitlement.yearlyUsageBasedPrice
      : period === "month"
        ? entitlement.monthlyUsageBasedPrice
        : undefined;

  // if there is any sort of limit
  let limit: number | undefined;
  if (
    entitlement.priceBehavior === "pay_in_advance" &&
    entitlement.allocation
  ) {
    limit = entitlement.allocation;
  } else if (entitlement.priceBehavior === "overage" && entitlement.softLimit) {
    limit = entitlement.softLimit;
  }

  // amount related to cost
  let amount: number | undefined;
  if (
    entitlement.priceBehavior === "pay_in_advance" &&
    entitlement.allocation
  ) {
    amount = entitlement.allocation;
  } else if (
    (entitlement.priceBehavior === "pay_as_you_go" ||
      entitlement.priceBehavior === "tier") &&
    entitlement.usage
  ) {
    amount = entitlement.usage;
  } else if (
    entitlement.priceBehavior === "overage" &&
    entitlement.usage &&
    entitlement.softLimit
  ) {
    amount = Math.max(0, entitlement.usage - entitlement.softLimit);
  }

  // total cost based on current usage or allocation
  const cost = getEntitlementCost(entitlement, period);

  // current price tier based on usage
  const tiers = billingPrice?.priceTier || [];

  let upTo: number | undefined;
  if (entitlement.priceBehavior === "tier" && entitlement.usage) {
    for (let i = 0, start = 0; i < tiers.length; i++) {
      const tier = tiers[i];
      const end = tier.upTo ?? Infinity;

      upTo = end;

      if (entitlement.usage > start && entitlement.usage <= end) {
        break;
      }

      start += end;
    }
  }

  return { ...entitlement, billingPrice, limit, amount, cost, upTo };
}
