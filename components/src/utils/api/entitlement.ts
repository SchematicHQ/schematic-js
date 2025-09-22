import {
  BillingPriceView,
  type FeatureUsageResponseData,
} from "../../api/checkoutexternal";
import { FeatureType, PriceBehavior } from "../../const";
import type { Entitlement, PriceTier } from "../../types";
import { getEntitlementCost } from "../../utils";

const PeriodName: Record<string, string | undefined> = {
  billing: "billing period",
  current_day: "day",
  current_month: "month",
  current_year: "year",
};

export function getMetricPeriodName(entitlement: Entitlement) {
  if (entitlement.feature?.featureType !== FeatureType.Event) {
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

export interface UsageDetails {
  billingPrice?: BillingPriceView;
  limit?: number;
  amount?: number;
  cost?: number;
  currentTier?: PriceTier;
}

export function getUsageDetails(
  entitlement: FeatureUsageResponseData,
  period?: string,
): UsageDetails {
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
    entitlement.priceBehavior === PriceBehavior.PayInAdvance &&
    typeof entitlement.allocation === "number"
  ) {
    limit = entitlement.allocation;
  } else if (
    entitlement.priceBehavior === PriceBehavior.Overage &&
    typeof entitlement.softLimit === "number"
  ) {
    limit = entitlement.softLimit;
  } else if (
    entitlement.priceBehavior === PriceBehavior.Credit &&
    typeof entitlement.creditTotal === "number"
  ) {
    limit = entitlement.creditTotal;
  }

  // amount related to cost
  let amount: number | undefined;
  if (
    entitlement.priceBehavior === PriceBehavior.PayInAdvance &&
    typeof entitlement.allocation === "number"
  ) {
    amount = entitlement.allocation;
  } else if (
    (entitlement.priceBehavior === PriceBehavior.PayAsYouGo ||
      entitlement.priceBehavior === PriceBehavior.Tiered) &&
    typeof entitlement.usage === "number"
  ) {
    amount = entitlement.usage;
  } else if (
    entitlement.priceBehavior === PriceBehavior.Overage &&
    typeof entitlement.usage === "number" &&
    typeof entitlement.softLimit === "number"
  ) {
    amount = Math.max(0, entitlement.usage - entitlement.softLimit);
  }

  // total cost based on current usage or allocation
  const cost = getEntitlementCost(entitlement, period);

  const tiers = billingPrice?.priceTier || [];

  // current price tier based on usage
  let currentTier: PriceTier | undefined;
  if (
    entitlement.priceBehavior === PriceBehavior.Overage &&
    typeof entitlement.softLimit === "number"
  ) {
    const overageTier =
      tiers.length === 2 ? tiers[tiers.length - 1] : undefined;
    if (overageTier) {
      const { upTo, ...rest } = overageTier || {};
      currentTier = {
        ...rest,
        from: entitlement.softLimit + 1,
        to: upTo ?? Infinity,
      };
    }
  } else if (
    entitlement.priceBehavior === PriceBehavior.Tiered &&
    typeof amount === "number"
  ) {
    for (let i = 0, start = 0; i < tiers.length; i++) {
      const { upTo, ...rest } = tiers[i];
      const end = upTo ?? Infinity;

      if (amount >= start && amount <= end) {
        currentTier = {
          ...rest,
          from: start,
          to: end,
        };
        break;
      }

      start = end + 1;
    }
  }

  return { billingPrice, limit, amount, cost, currentTier };
}
