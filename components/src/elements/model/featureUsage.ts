import type { FeatureUsage, MeteredPrice } from "@schematichq/schematic-react";

/**
 * What IncludedFeatures and MeteredFeatures both read off a usage row: the
 * limit a row is shown against, the price tier its usage sits in, and the
 * period its price is billed per. The server has already picked the one
 * price the company pays and what it costs; this is how that price reads.
 */

export type PriceTier = MeteredPrice["priceTiers"][number];

/** A tier as a range of units, with the price for a unit or the flat fee. */
export interface TierRange {
  from: number;
  /** `null` for the last tier, which has no upper bound. */
  to: number | null;
  flatPrice: number | null;
  /** Minor units, fractional where the provider prices below a cent. */
  perUnitPrice: number | null;
}

/**
 * "month", "quarter" or "year": the period a price is billed per, from its
 * interval and interval count (a quarter is three months). `null` without a
 * price.
 */
export function pricePeriod(price: MeteredPrice | undefined): string | null {
  if (price === undefined) {
    return null;
  }
  if (price.interval === "month" && price.intervalCount === 3) {
    return "quarter";
  }
  return price.interval;
}

/** Tiered when it has more than one tier, or a tiers mode says so. */
export function isTieredPrice(price: MeteredPrice | undefined): boolean {
  return (
    price !== undefined &&
    (price.priceTiers.length > 1 ||
      (price.tiersMode !== undefined && price.tiersMode !== null))
  );
}

/** A unit's price in minor units, the provider's decimal where it has one. */
export function unitPrice(price: MeteredPrice): number {
  return decimalOr(price.priceDecimal, price.price);
}

export interface UsageLimitOptions {
  /**
   * Show the entitlement's warning threshold in place of its limit where one
   * is configured. In a fair-use setup the limit is the ceiling and the
   * threshold is the advertised number. Default false.
   */
  showWarningThresholdAsLimit?: boolean;
}

/**
 * The number a row's usage is shown against: the allocation for a row with
 * no price behavior or one paid in advance, the soft limit for overage, or
 * the warning threshold when asked for and configured. `null` when none
 * applies.
 */
export function usageLimit(
  row: FeatureUsage,
  options: UsageLimitOptions = {},
): number | null {
  let limit: number | null = null;
  const behavior = row.priceBehavior ?? null;
  if (
    (behavior === null || behavior === "pay_in_advance") &&
    typeof row.allocation === "number"
  ) {
    limit = row.allocation;
  } else if (behavior === "overage" && typeof row.softLimit === "number") {
    limit = row.softLimit;
  }
  if (
    options.showWarningThresholdAsLimit === true &&
    typeof row.warningThreshold === "number"
  ) {
    limit = row.warningThreshold;
  }
  return limit;
}

/**
 * The tier a row's usage sits in. For overage, the tier past the soft limit
 * of a two-tier price, which is how an overage price is built; for tiered
 * pricing, the tier holding the usage. `null` otherwise.
 */
export function currentTier(row: FeatureUsage): TierRange | null {
  const tiers = row.price?.priceTiers ?? [];
  if (row.priceBehavior === "overage" && typeof row.softLimit === "number") {
    const overage = tiers.length === 2 ? tiers[1] : undefined;
    return overage === undefined
      ? null
      : { ...tierRange(overage), from: row.softLimit + 1 };
  }
  if (row.priceBehavior === "tier" && typeof row.usage === "number") {
    const usage = row.usage;
    const tier = tiers.find(
      (t) =>
        usage >= t.from &&
        (t.to === undefined || t.to === null || usage <= t.to),
    );
    return tier === undefined ? null : tierRange(tier);
  }
  return null;
}

/** Every tier of the price, the first starting at one unit. */
export function tierRanges(price: MeteredPrice | undefined): TierRange[] {
  return (price?.priceTiers ?? []).map((tier, index) => {
    const range = tierRange(tier);
    return index === 0 ? { ...range, from: Math.max(1, range.from) } : range;
  });
}

function tierRange(tier: PriceTier): TierRange {
  return {
    from: tier.from,
    to: tier.to ?? null,
    flatPrice: tier.flatPrice ?? null,
    perUnitPrice:
      tier.perUnitPriceDecimal !== undefined &&
      tier.perUnitPriceDecimal !== null
        ? decimalOr(tier.perUnitPriceDecimal, tier.perUnitPrice ?? 0)
        : (tier.perUnitPrice ?? null),
  };
}

function decimalOr(
  decimal: string | null | undefined,
  fallback: number,
): number {
  if (decimal === undefined || decimal === null) {
    return fallback;
  }
  const parsed = Number(decimal);
  return Number.isFinite(parsed) ? parsed : fallback;
}
