import {
  BillingPriceView,
  type FeatureUsageResponseData,
  type PlanEntitlementResponseData,
} from "../../api/checkoutexternal";
import { EntitlementValueType, FeatureType, PriceBehavior } from "../../const";
import type {
  Credit,
  CurrentUsageBasedEntitlement,
  Entitlement,
  Feature,
  PriceTier,
} from "../../types";
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
    typeof entitlement.creditTotal === "number" &&
    typeof entitlement.creditConsumptionRate === "number"
  ) {
    limit = entitlement.creditTotal / entitlement.creditConsumptionRate;
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
  } else if (
    entitlement.priceBehavior === PriceBehavior.Credit &&
    typeof entitlement.creditUsed === "number" &&
    typeof entitlement.creditConsumptionRate === "number"
  ) {
    amount = entitlement.creditUsed / entitlement.creditConsumptionRate;
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

export interface EntitlementDescriptionData {
  // Calculated values
  hasNumericValue: boolean;
  limit: number | null | undefined;
  creditBasedEntitlementLimit?: { limit: number; period?: string };
  entitlementPrice?: number;
  entitlementPriceTiers?: PriceTier[];
  entitlementCurrency?: string;
  entitlementPackageSize: number;
  metricPeriodName?: string;

  // Component props
  tieredPricingDetailsProps?: {
    entitlement: PlanEntitlementResponseData;
    period: string;
  };

  pricingTiersTooltipProps?: {
    feature: Feature | undefined;
    period: string;
    currency: string | undefined;
    priceTiers: PriceTier[] | undefined;
  };

  billingThresholdTooltipProps?: {
    billingThreshold: number;
  };
}

/**
 * Calculates entitlement description data for rendering.
 *
 * Extracts and computes all the necessary data for displaying plan entitlements,
 * including pricing, limits, credits, and tooltips.
 */

export function getEntitlementDescriptionData(
  entitlement: PlanEntitlementResponseData,
  planPeriod: string,
  credits: Credit[],
  getEntitlementPriceFn: (
    entitlement: PlanEntitlementResponseData,
    period: string,
  ) =>
    | {
        price?: number;
        priceTier?: PriceTier[];
        currency?: string;
        packageSize?: number;
      }
    | undefined,
): EntitlementDescriptionData {
  const hasNumericValue =
    entitlement.valueType === EntitlementValueType.Numeric ||
    entitlement.valueType === EntitlementValueType.Unlimited ||
    entitlement.valueType === EntitlementValueType.Trait;

  const limit = entitlement.softLimit ?? entitlement.valueNumeric;
  const creditBasedEntitlementLimit = getCreditBasedEntitlementLimit(
    entitlement,
    credits,
  );

  const {
    price: entitlementPrice,
    priceTier: entitlementPriceTiers,
    currency: entitlementCurrency,
    packageSize: entitlementPackageSize = 1,
  } = getEntitlementPriceFn(entitlement, planPeriod) || {};

  const metricPeriodName = getMetricPeriodName(entitlement);

  const tieredPricingDetailsProps =
    entitlement.priceBehavior === PriceBehavior.Tiered
      ? {
          entitlement,
          period: planPeriod,
        }
      : undefined;

  const pricingTiersTooltipProps =
    entitlement.priceBehavior === PriceBehavior.Tiered
      ? {
          feature: entitlement.feature,
          period: planPeriod,
          currency: entitlementCurrency,
          priceTiers: entitlementPriceTiers,
        }
      : undefined;

  const billingThresholdTooltipProps = entitlement.billingThreshold
    ? {
        billingThreshold: entitlement.billingThreshold,
      }
    : undefined;

  return {
    hasNumericValue,
    limit,
    creditBasedEntitlementLimit,
    entitlementPrice,
    entitlementPriceTiers,
    entitlementCurrency,
    entitlementPackageSize,
    metricPeriodName,
    tieredPricingDetailsProps,
    pricingTiersTooltipProps,
    billingThresholdTooltipProps,
  };
}
