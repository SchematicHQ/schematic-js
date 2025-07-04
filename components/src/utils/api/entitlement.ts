import {
  type BillingProductPriceTierResponseData,
  type FeatureUsageResponseData,
} from "../../api/checkoutexternal";
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

export function getUsageDetails(
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
    typeof entitlement.allocation === "number"
  ) {
    limit = entitlement.allocation;
  } else if (
    entitlement.priceBehavior === "overage" &&
    typeof entitlement.softLimit === "number"
  ) {
    limit = entitlement.softLimit;
  }

  // amount related to cost
  let amount: number | undefined;
  if (
    entitlement.priceBehavior === "pay_in_advance" &&
    typeof entitlement.allocation === "number"
  ) {
    amount = entitlement.allocation;
  } else if (
    (entitlement.priceBehavior === "pay_as_you_go" ||
      entitlement.priceBehavior === "tier") &&
    typeof entitlement.usage === "number"
  ) {
    amount = entitlement.usage;
  } else if (
    entitlement.priceBehavior === "overage" &&
    typeof entitlement.usage === "number" &&
    typeof entitlement.softLimit === "number"
  ) {
    amount = Math.max(0, entitlement.usage - entitlement.softLimit);
  }

  // total cost based on current usage or allocation
  const cost = getEntitlementCost(entitlement, period);

  const tiers = billingPrice?.priceTier || [];

  // current price tier based on usage
  let currentTier:
    | (Omit<BillingProductPriceTierResponseData, "upTo"> & {
        from?: number;
        to?: number;
      })
    | undefined;
  if (
    entitlement.priceBehavior === "overage" &&
    typeof entitlement.softLimit === "number"
  ) {
    const overageTier = tiers.length === 2 ? tiers.at(-1) : undefined;
    if (overageTier) {
      const { upTo, ...rest } = overageTier || {};
      currentTier = {
        ...rest,
        from: entitlement.softLimit + 1,
        to: upTo ?? Infinity,
      };
    }
  } else if (
    entitlement.priceBehavior === "tier" &&
    typeof amount === "number"
  ) {
    for (let i = 0, from = 0; i < tiers.length; i++) {
      const { upTo, ...rest } = tiers[i];
      const end = upTo ?? Infinity;

      if (amount >= from && amount <= end) {
        currentTier = {
          ...rest,
          from,
          to: end,
        };
        break;
      }

      from += end;
    }
  }

  return { ...entitlement, billingPrice, limit, amount, cost, currentTier };
}
