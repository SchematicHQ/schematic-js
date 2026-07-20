import {
  BillingPriceView,
  EntitlementPriceBehavior,
  FeatureType,
  type FeatureUsageResponseData,
  type PlanEntitlementResponseData,
} from "../../api/checkoutexternal";
import type {
  Credit,
  CurrentUsageBasedEntitlement,
  Entitlement,
  PriceTier,
  SharedEntitlementUsageProps,
} from "../../types";
import { getEntitlementCost } from "../../utils";
import { getEntitlementPrice } from "./billing";

const PeriodName: Record<string, string | undefined> = {
  billing: "billing period",
  current_day: "day",
  current_week: "week",
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

export interface GetUsageDetailsOptions {
  /**
   * When true, display the entitlement's configured warning threshold in place
   * of its hard limit. In a fair-use setup the limit is the burst ceiling and
   * the warning threshold is the advertised number; enabling this surfaces the
   * advertised number. Falls back to the hard limit when no threshold is set.
   */
  showWarningThresholdAsLimit?: boolean;
}

export function getUsageDetails(
  entitlement: FeatureUsageResponseData,
  period?: string,
  currency?: string,
  options?: GetUsageDetailsOptions,
): UsageDetails {
  // billing price associated with the current period
  const billingPrice = currency
    ? getEntitlementPrice(entitlement, period ?? "month", currency)
    : period === "year"
      ? entitlement.yearlyUsageBasedPrice
      : period === "quarter"
        ? entitlement.quarterlyUsageBasedPrice
        : period === "month"
          ? entitlement.monthlyUsageBasedPrice
          : undefined;

  // if there is any sort of limit
  let limit: number | undefined;
  if (
    (!entitlement.priceBehavior ||
      entitlement.priceBehavior === EntitlementPriceBehavior.PayInAdvance) &&
    typeof entitlement.allocation === "number"
  ) {
    limit = entitlement.allocation;
  } else if (
    entitlement.priceBehavior === EntitlementPriceBehavior.Overage &&
    typeof entitlement.softLimit === "number"
  ) {
    limit = entitlement.softLimit;
  } else if (
    entitlement.priceBehavior === EntitlementPriceBehavior.CreditBurndown &&
    typeof entitlement.creditTotal === "number" &&
    typeof entitlement.creditConsumptionRate === "number"
  ) {
    limit = entitlement.creditTotal / entitlement.creditConsumptionRate;
  }

  // amount related to cost
  let amount: number | undefined;
  if (
    entitlement.priceBehavior === EntitlementPriceBehavior.PayInAdvance &&
    typeof entitlement.allocation === "number"
  ) {
    amount = entitlement.allocation;
  } else if (
    (entitlement.priceBehavior === EntitlementPriceBehavior.PayAsYouGo ||
      entitlement.priceBehavior === EntitlementPriceBehavior.Tier) &&
    typeof entitlement.usage === "number"
  ) {
    amount = entitlement.usage;
  } else if (
    entitlement.priceBehavior === EntitlementPriceBehavior.Overage &&
    typeof entitlement.usage === "number" &&
    typeof entitlement.softLimit === "number"
  ) {
    amount = Math.max(0, entitlement.usage - entitlement.softLimit);
  } else if (
    entitlement.priceBehavior === EntitlementPriceBehavior.CreditBurndown &&
    typeof entitlement.creditUsed === "number" &&
    typeof entitlement.creditConsumptionRate === "number"
  ) {
    amount = entitlement.creditUsed / entitlement.creditConsumptionRate;
  }

  // total cost based on current usage or allocation
  const cost = getEntitlementCost(entitlement, period, currency);

  const tiers = billingPrice?.priceTier || [];

  // current price tier based on usage
  let currentTier: PriceTier | undefined;
  if (
    entitlement.priceBehavior === EntitlementPriceBehavior.Overage &&
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
    entitlement.priceBehavior === EntitlementPriceBehavior.Tier &&
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

  // When configured, display the warning threshold in place of the hard limit
  // (the advertised number in a fair-use setup). Only overrides when a threshold
  // is actually configured, so it is a no-op for entitlements without one.
  if (options?.showWarningThresholdAsLimit) {
    const warningThreshold = getEntitlementWarningThreshold(
      entitlement.planEntitlement?.warningTiers,
    );
    if (typeof warningThreshold === "number") {
      limit = warningThreshold;
    }
  }

  return { billingPrice, limit, amount, cost, currentTier };
}

/**
 * The key the dashboard assigns to the single warning tier it configures per
 * entitlement. Consumers resolve the threshold by this key rather than by array
 * position, so a future named tier can't be mistaken for the default one.
 */
export const WARNING_TIER_DEFAULT_KEY = "default";

/**
 * Resolves the configured warning threshold (the "default" warning tier's value)
 * from an entitlement's `warningTiers`, or undefined when none is configured.
 * Used across every limit-display surface: usage responses expose the tiers under
 * `planEntitlement.warningTiers`, while the plan-catalog/checkout surfaces carry
 * them directly on the plan entitlement.
 */
export function getEntitlementWarningThreshold(
  warningTiers:
    | Pick<PlanEntitlementResponseData, "warningTiers">["warningTiers"]
    | undefined
    | null,
): number | undefined {
  const tier = warningTiers?.find((t) => t?.key === WARNING_TIER_DEFAULT_KEY);
  return typeof tier?.value === "number" ? tier.value : undefined;
}

export function getCreditBasedEntitlementLimit(
  entitlement: PlanEntitlementResponseData,
  credits: Credit[],
) {
  const matchedCredit = credits.find(
    (credit) => credit.id === entitlement.valueCredit?.id,
  );

  if (matchedCredit && entitlement.consumptionRate) {
    return {
      limit: Math.floor(matchedCredit.quantity / entitlement.consumptionRate),
      period: matchedCredit.period,
    };
  }
}

export function extractCurrentUsageBasedEntitlements(
  features: Array<FeatureUsageResponseData> = [],
  planPeriod: string,
): CurrentUsageBasedEntitlement[] {
  return features.reduce((acc: CurrentUsageBasedEntitlement[], entitlement) => {
    if (
      entitlement.priceBehavior &&
      ((planPeriod === "month" && entitlement.monthlyUsageBasedPrice) ||
        (planPeriod === "quarter" && entitlement.quarterlyUsageBasedPrice) ||
        (planPeriod === "year" && entitlement.yearlyUsageBasedPrice))
    ) {
      const allocation = entitlement.allocation || 0;
      const usage = entitlement.usage || 0;
      const quantity = allocation ?? usage;
      acc.push({
        ...entitlement,
        allocation,
        usage,
        quantity,
      });
    }
    return acc;
  }, []);
}

/**
 * Extracts the feature name from an entitlement object with a fallback chain.
 * Priority: feature.pluralName -> feature.name -> featureName -> defaultValue
 */
export function getEntitlementFeatureName(
  entitlement: {
    feature?: { pluralName?: string | null; name?: string | null };
    featureName?: string | null;
  },
  defaultValue?: string,
): string {
  return (
    entitlement.feature?.pluralName ||
    entitlement.feature?.name ||
    entitlement.featureName ||
    defaultValue ||
    ""
  );
}

export function entitlementHasCost(
  entitlement: Entitlement & SharedEntitlementUsageProps,
) {
  return (
    entitlement.priceBehavior &&
    ((entitlement.priceBehavior === EntitlementPriceBehavior.PayInAdvance &&
      entitlement.quantity > 0) ||
      entitlement.priceBehavior !== EntitlementPriceBehavior.PayInAdvance)
  );
}

export function entitlementHasHardLimit(entitlement: {
  priceBehavior?: EntitlementPriceBehavior | null;
}) {
  return (
    entitlement.priceBehavior &&
    entitlement.priceBehavior !== EntitlementPriceBehavior.CreditBurndown
  );
}
