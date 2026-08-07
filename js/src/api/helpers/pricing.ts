import {
  EntitlementPriceBehavior,
  type BillingProductPriceTierResponseData,
  type CompanySubscriptionResponseData,
  type FeatureUsageResponseData,
} from "../checkoutexternal";

/**
 * Structural price shape shared by BillingPriceResponseData and
 * BillingPriceView (the generated models differ only in extra fields).
 */
export interface PriceData {
  price: number;
  priceDecimal?: string | null;
  currency: string;
  interval?: string;
  priceTier?: BillingProductPriceTierResponseData[];
  tiersMode?: string | null;
  packageSize?: number;
}

/** Structural plan shape shared by CatalogPlan and PlanDetailResponseData. */
export interface PricedPlan {
  chargeType?: string;
  monthlyPrice?: PriceData;
  quarterlyPrice?: PriceData;
  yearlyPrice?: PriceData;
  oneTimePrice?: PriceData;
}

const hasDecimal = (value: string | null | undefined): value is string =>
  value != null && value !== "";

/**
 * Resolves a display period from an interval + interval_count pair. Quarterly
 * prices are stored as interval="month" with interval_count=3, so they must be
 * detected here rather than inferred from `interval` alone.
 */
export function derivePeriod(
  interval?: string | null,
  intervalCount?: number | null,
): string | undefined {
  if (interval == null || interval === "") {
    return undefined;
  }
  if (interval === "month" && intervalCount === 3) {
    return "quarter";
  }
  return interval;
}

/**
 * The effective period of the current subscription, preferring the recurring
 * products' interval + interval_count (so quarterly is surfaced even when the
 * legacy `interval` field reports "month").
 */
export function getSubscriptionPeriod(
  subscription?: CompanySubscriptionResponseData | null,
): string | undefined {
  if (subscription == null) {
    return undefined;
  }
  const product = subscription.products.find(
    (p) => p.interval != null && p.interval !== "" && p.interval !== "one-time",
  );
  return (
    derivePeriod(product?.interval, product?.intervalCount) ??
    derivePeriod(subscription.interval)
  );
}

/**
 * Prefers the lossless decimal representation when the API provides one.
 * The decimal may come through as "" rather than null; Number("") is 0, so
 * only a non-empty decimal is trusted over `price`.
 */
export function getPriceValue(price: PriceData): number {
  return hasDecimal(price.priceDecimal)
    ? Number(price.priceDecimal)
    : price.price;
}

function selectPriceForPeriod<T extends PricedPlan>(
  source: T,
  period: string,
): PriceData | undefined {
  switch (period) {
    case "year":
      return source.yearlyPrice;
    case "quarter":
      return source.quarterlyPrice;
    default:
      return source.monthlyPrice;
  }
}

export function getPlanPrice(
  plan: PricedPlan,
  period = "month",
): PriceData | undefined {
  const price = selectPriceForPeriod(plan, period);
  if (price !== undefined) {
    return { ...price, price: getPriceValue(price) };
  }
}

export function getAddOnPrice(
  addOn: PricedPlan,
  period = "month",
): PriceData | undefined {
  const price =
    addOn.chargeType === "one_time"
      ? addOn.oneTimePrice
      : selectPriceForPeriod(addOn, period);
  if (price !== undefined) {
    return { ...price, price: getPriceValue(price) };
  }
}

/**
 * A price tier's per-unit price, preferring the lossless decimal. Tiered
 * schemes commonly express sub-cent rates only in `perUnitPriceDecimal`, with
 * `perUnitPrice` rounded to 0.
 */
export function getTierUnitPrice(
  tier: BillingProductPriceTierResponseData,
): number {
  return hasDecimal(tier.perUnitPriceDecimal)
    ? Number(tier.perUnitPriceDecimal)
    : (tier.perUnitPrice ?? 0);
}

/**
 * The usage-based price attached to a feature-usage entitlement for the given
 * period. For tiered schemes the parent price carries a stale price/decimal
 * (typically 0), so the relevant tier's per-unit price is substituted:
 * the last tier for overage, the tier the current usage lands in for Tier.
 */
export function getEntitlementPrice(
  entitlement: FeatureUsageResponseData,
  period = "month",
): PriceData | undefined {
  const source = selectPriceForPeriod(
    {
      monthlyPrice: entitlement.monthlyUsageBasedPrice,
      quarterlyPrice: entitlement.quarterlyUsageBasedPrice,
      yearlyPrice: entitlement.yearlyUsageBasedPrice,
    },
    period,
  );
  if (source === undefined) {
    return undefined;
  }

  const price: PriceData = { ...source };
  const tiers = price.priceTier;

  if (tiers !== undefined && tiers.length > 0) {
    let tier: BillingProductPriceTierResponseData | undefined;
    if (entitlement.priceBehavior === EntitlementPriceBehavior.Overage) {
      tier = tiers[tiers.length - 1];
    } else if (entitlement.priceBehavior === EntitlementPriceBehavior.Tier) {
      tier = findTierForQuantity(tiers, entitlement.usage ?? 0);
    }

    if (tier !== undefined) {
      // Realign both fields with the tier so getPriceValue does not return the
      // parent tiered price's stale decimal (typically "0").
      price.price = getTierUnitPrice(tier);
      price.priceDecimal = hasDecimal(tier.perUnitPriceDecimal)
        ? tier.perUnitPriceDecimal
        : null;
    }
  }

  return { ...price, price: getPriceValue(price) };
}

/** The tier a given quantity falls into, by ascending `upTo` bound. */
export function findTierForQuantity(
  tiers: BillingProductPriceTierResponseData[],
  quantity: number,
): BillingProductPriceTierResponseData | undefined {
  let start = 0;
  for (const tier of tiers) {
    const end = tier.upTo ?? Infinity;
    if (quantity >= start && quantity <= end) {
      return tier;
    }
    start = end + 1;
  }
  return tiers[tiers.length - 1];
}

export function isTieredPrice(price?: PriceData): boolean {
  if (price === undefined) {
    return false;
  }
  return (
    (price.priceTier?.length ?? 0) > 1 ||
    (price.tiersMode != null && price.tiersMode !== "")
  );
}

export function calculateTieredCost(
  quantity: number,
  priceTiers: BillingProductPriceTierResponseData[],
  tiersMode?: string | null,
): number {
  let cost = 0;

  if (tiersMode === "volume") {
    let start = 0;
    const currentTier = priceTiers.find((tier) => {
      const end = tier.upTo ?? Infinity;
      const isCurrentTier = quantity >= start && quantity <= end;
      start = end + 1;
      return isCurrentTier;
    });

    if (quantity > 0) {
      const flatAmount = currentTier?.flatAmount ?? 0;
      const perUnitPrice =
        currentTier !== undefined ? getTierUnitPrice(currentTier) : 0;
      cost += quantity * perUnitPrice + flatAmount;
    }
  } else {
    // graduated (the default): each tier charges for its own span
    let acc = 0;
    for (const tier of priceTiers) {
      const upTo = tier.upTo ?? Infinity;
      const flatAmount = tier.flatAmount ?? 0;
      const perUnitPrice = getTierUnitPrice(tier);

      if (acc < quantity) {
        const tierAmount = Math.min(upTo, quantity) - acc;
        cost += flatAmount;
        cost += tierAmount * perUnitPrice;
        acc += tierAmount;
      }
    }
  }

  return cost;
}

/** The current cost of a usage-based entitlement, by price behavior. */
export function getEntitlementCost(
  entitlement: FeatureUsageResponseData,
  period: string | null = "month",
): number | undefined {
  const resolvedPeriod = period ?? "month";
  const price = getEntitlementPrice(entitlement, resolvedPeriod);
  if (price === undefined) {
    return undefined;
  }

  switch (entitlement.priceBehavior) {
    case EntitlementPriceBehavior.PayInAdvance: {
      if (
        typeof entitlement.allocation === "number" &&
        entitlement.allocation > 0
      ) {
        if (isTieredPrice(price) && price.priceTier !== undefined) {
          return calculateTieredCost(
            entitlement.allocation,
            price.priceTier,
            price.tiersMode,
          );
        }
        return entitlement.allocation * price.price;
      }
      return undefined;
    }
    case EntitlementPriceBehavior.PayAsYouGo: {
      if (typeof entitlement.usage === "number" && entitlement.usage > 0) {
        return entitlement.usage * price.price;
      }
      return undefined;
    }
    case EntitlementPriceBehavior.Overage: {
      if (typeof entitlement.usage !== "number" || entitlement.usage <= 0) {
        return undefined;
      }
      const overageTier = price.priceTier?.[price.priceTier.length - 1];
      if (overageTier === undefined) {
        return undefined;
      }
      // Nothing is owed until usage passes the included allotment — the
      // overage tier's flat amount is part of the overage charge, not a
      // standing fee, so it must not be billed to a customer under the limit.
      const amount = Math.max(
        0,
        entitlement.usage - (entitlement.softLimit ?? 0),
      );
      if (amount === 0) {
        return undefined;
      }
      // Prefer the decimal rate: sub-cent overage prices come through with
      // perUnitPrice rounded to 0 and the real rate only in the decimal.
      return (
        (overageTier.flatAmount ?? 0) + amount * getTierUnitPrice(overageTier)
      );
    }
    case EntitlementPriceBehavior.Tier: {
      if (
        typeof entitlement.usage === "number" &&
        price.priceTier !== undefined
      ) {
        return calculateTieredCost(
          entitlement.usage,
          price.priceTier,
          price.tiersMode,
        );
      }
      return undefined;
    }
    default:
      return undefined;
  }
}
