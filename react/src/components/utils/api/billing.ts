import {
  EntitlementPriceBehavior,
  type BillingCreditView,
  type BillingPriceResponseData,
  type BillingPriceView,
  type BillingProductPriceTierResponseData,
  type BillingSubscriptionView,
  type FeatureUsageResponseData,
  type PreviewSubscriptionFinanceResponseData,
} from "../../api/checkoutexternal";
import type { BillingPrice, Entitlement, Plan } from "../../types";

/**
 * Resolves a display period from an interval + interval_count pair.
 * Quarterly prices are stored as interval="month" with interval_count=3, so
 * they must be detected here rather than inferred from `interval` alone.
 */
export function derivePeriod(
  interval?: string | null,
  intervalCount?: number | null,
): string | undefined {
  if (!interval) {
    return undefined;
  }
  if (interval === "month" && intervalCount === 3) {
    return "quarter";
  }
  return interval;
}

/**
 * Derives the effective period of a current subscription, preferring the
 * recurring products' interval + interval_count (so quarterly is surfaced
 * even when the legacy `interval` field returns "month").
 */
export function getSubscriptionPeriod(
  billingSubscription?: BillingSubscriptionView | null,
): string | undefined {
  if (!billingSubscription) {
    return undefined;
  }

  const product = billingSubscription.products?.find(
    (p) => p.interval && p.interval !== "one-time",
  );

  return (
    derivePeriod(product?.interval, product?.intervalCount) ??
    derivePeriod(billingSubscription.interval)
  );
}

export const ChargeType = {
  oneTime: "one_time",
  recurring: "recurring",
  free: "free",
};

export function getPriceValue(billingPrice: BillingPrice): number {
  const price =
    typeof billingPrice.priceDecimal === "string"
      ? Number(billingPrice.priceDecimal)
      : billingPrice.price;

  return price;
}

interface PlanPriceOptions {
  useSelectedPeriod?: boolean;
}

type PricesForPeriod<T> = {
  monthlyPrice?: T;
  quarterlyPrice?: T;
  yearlyPrice?: T;
};

function selectPriceForPeriod<T>(
  source: PricesForPeriod<T>,
  period: string,
): T | undefined {
  switch (period) {
    case "year":
      return source.yearlyPrice;
    case "quarter":
      return source.quarterlyPrice;
    default:
      return source.monthlyPrice;
  }
}

function selectAvailablePrice<T>(source: PricesForPeriod<T>): T | undefined {
  return source.monthlyPrice ?? source.quarterlyPrice ?? source.yearlyPrice;
}

export function getPlanPrice(
  plan: Plan,
  period = "month",
  options: PlanPriceOptions = { useSelectedPeriod: true },
  currency?: string,
): BillingPriceResponseData | undefined {
  if (currency && plan.currencyPrices?.length) {
    const currencyPrice = plan.currencyPrices.find(
      (cp) => cp.currency.toLowerCase() === currency.toLowerCase(),
    );
    if (currencyPrice) {
      const billingPrice = options.useSelectedPeriod
        ? selectPriceForPeriod(currencyPrice, period)
        : selectAvailablePrice(currencyPrice);

      if (billingPrice) {
        return { ...billingPrice, price: getPriceValue(billingPrice) };
      }
    }
  }

  const billingPrice = options.useSelectedPeriod
    ? selectPriceForPeriod(plan, period)
    : selectAvailablePrice(plan);

  if (billingPrice) {
    return { ...billingPrice, price: getPriceValue(billingPrice) };
  }
}

/**
 * Whether the plan prices the given period in the given currency *specifically*
 * — i.e. `getPlanPrice` would return a real currency price rather than silently
 * falling back to the plan's default-currency price for that period.
 *
 * - Returns true when no currency is requested (nothing to mismatch).
 * - Returns true for a free/unpriced plan (no price to mischarge).
 * - Returns false only when a currency is requested and the resolved price
 *   belongs to a different currency (the silent-fallback case).
 *
 * Use this to detect incoherent currency/period combinations passed via the
 * checkout bypass config before they reach checkout.
 */
export function planOffersCurrencyForPeriod(
  plan: Plan,
  period = "month",
  currency?: string,
): boolean {
  if (!currency) return true;

  const price = getPlanPrice(
    plan,
    period,
    { useSelectedPeriod: true },
    currency,
  );
  // No price at all: free/unpriced plan — nothing to mischarge.
  if (!price) return true;

  return price.currency.toUpperCase() === currency.toUpperCase();
}

export function getAddOnPrice(
  addOn: Plan,
  period = "month",
  currency?: string,
): BillingPriceResponseData | undefined {
  if (currency && addOn.currencyPrices?.length) {
    const currencyPrice = addOn.currencyPrices.find(
      (cp) => cp.currency.toLowerCase() === currency.toLowerCase(),
    );
    if (currencyPrice) {
      const billingPrice =
        addOn.chargeType === ChargeType.oneTime
          ? currencyPrice.oneTimePrice
          : selectPriceForPeriod(currencyPrice, period);

      if (billingPrice) {
        return { ...billingPrice, price: getPriceValue(billingPrice) };
      }
    }
  }

  const billingPrice =
    addOn.chargeType === ChargeType.oneTime
      ? addOn.oneTimePrice
      : selectPriceForPeriod(addOn, period);

  if (billingPrice) {
    return { ...billingPrice, price: getPriceValue(billingPrice) };
  }
}

/**
 * Returns true if the plan/add-on offers pricing in the given currency.
 *
 * - If `currency` is omitted, returns true (no filter).
 * - If the plan has explicit `currencyPrices`, the currency must be present
 *   there.
 * - Otherwise we treat the legacy single-currency pricing fields as
 *   authoritative and match against whichever interval price is set.
 * - A plan with no pricing at all (e.g. a free plan) is currency-agnostic.
 */
export function planSupportsCurrency(plan: Plan, currency?: string): boolean {
  if (!currency) return true;

  const target = currency.toLowerCase();

  if (plan.currencyPrices?.length) {
    return plan.currencyPrices.some(
      (cp) => cp.currency.toLowerCase() === target,
    );
  }

  const legacyCurrency =
    plan.monthlyPrice?.currency ??
    plan.yearlyPrice?.currency ??
    plan.oneTimePrice?.currency;

  return !legacyCurrency || legacyCurrency.toLowerCase() === target;
}

export function getEntitlementPrice(
  entitlement: Entitlement,
  period = "month",
  currency?: string,
): BillingPriceView | undefined {
  // Resolve currency prices from whichever shape carries them:
  // PlanEntitlementResponseData has currencyPrices directly,
  // FeatureUsageResponseData carries them on planEntitlement.
  const currencyPrices =
    "valueType" in entitlement
      ? entitlement.currencyPrices
      : "entitlementType" in entitlement
        ? entitlement.planEntitlement?.currencyPrices
        : undefined;

  let source: BillingPriceView | undefined;

  if (currency && currencyPrices?.length) {
    const currencyPrice = currencyPrices.find(
      (cp) => cp.currency.toLowerCase() === currency.toLowerCase(),
    );
    if (currencyPrice) {
      source = selectPriceForPeriod(currencyPrice, period);
    }
  }

  if (!source) {
    if ("valueType" in entitlement) {
      // entitlement
      source = selectPriceForPeriod(
        {
          monthlyPrice: entitlement.meteredMonthlyPrice,
          quarterlyPrice: entitlement.meteredQuarterlyPrice,
          yearlyPrice: entitlement.meteredYearlyPrice,
        },
        period,
      );
    } else if ("entitlementType" in entitlement) {
      // feature usage
      source = selectPriceForPeriod(
        {
          monthlyPrice: entitlement.monthlyUsageBasedPrice,
          quarterlyPrice: entitlement.quarterlyUsageBasedPrice,
          yearlyPrice: entitlement.yearlyUsageBasedPrice,
        },
        period,
      );
    }
  }

  if (source) {
    const billingPrice = { ...source };

    if (
      entitlement.priceBehavior === EntitlementPriceBehavior.Overage &&
      billingPrice.priceTier?.length
    ) {
      const overagePriceTier =
        billingPrice.priceTier[billingPrice.priceTier.length - 1];

      if (typeof overagePriceTier.perUnitPrice === "number") {
        billingPrice.price = overagePriceTier.perUnitPrice;
      }

      // Always realign priceDecimal with the overage tier so getPriceValue
      // does not return the parent tiered price's stale priceDecimal (which
      // is typically "0" for tiered schemes and would mask the per-unit cost).
      billingPrice.priceDecimal =
        typeof overagePriceTier.perUnitPriceDecimal === "string"
          ? overagePriceTier.perUnitPriceDecimal
          : null;
    }

    return { ...billingPrice, price: getPriceValue(billingPrice) };
  }
}

export function getCreditPrice(
  credit: BillingCreditView,
): BillingPriceView | undefined {
  if (credit.price) {
    return { ...credit.price, price: getPriceValue(credit.price) };
  }
}

export function isTieredPrice(billingPrice?: BillingPriceView): boolean {
  if (!billingPrice) return false;
  return (billingPrice.priceTier?.length ?? 0) > 1 || !!billingPrice.tiersMode;
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
        typeof currentTier?.perUnitPriceDecimal === "string"
          ? Number(currentTier.perUnitPriceDecimal)
          : (currentTier?.perUnitPrice ?? 0);
      cost += quantity * perUnitPrice + (flatAmount ?? 0);
    }
  } else {
    // default to graduated tiers mode
    let acc = 0;

    for (let i = 0; i < priceTiers.length; i++) {
      const tier = priceTiers[i];
      const upTo = tier.upTo ?? Infinity;
      const flatAmount = tier.flatAmount ?? 0;
      const perUnitPrice =
        typeof tier.perUnitPriceDecimal === "string"
          ? Number(tier.perUnitPriceDecimal)
          : (tier.perUnitPrice ?? 0);

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

export function getEntitlementCost(
  entitlement: FeatureUsageResponseData,
  period: string | null = "month",
  currency?: string,
): number | undefined {
  const resolvedPeriod = period ?? "month";
  const source = currency
    ? getEntitlementPrice(entitlement, resolvedPeriod, currency)
    : selectPriceForPeriod(
        {
          monthlyPrice: entitlement.monthlyUsageBasedPrice,
          quarterlyPrice: entitlement.quarterlyUsageBasedPrice,
          yearlyPrice: entitlement.yearlyUsageBasedPrice,
        },
        resolvedPeriod,
      );

  if (source) {
    const billingPrice: BillingPriceView = { ...source };

    if (
      entitlement.priceBehavior === EntitlementPriceBehavior.PayInAdvance &&
      typeof entitlement.allocation === "number" &&
      entitlement.allocation > 0
    ) {
      if (isTieredPrice(billingPrice)) {
        return calculateTieredCost(
          entitlement.allocation,
          billingPrice.priceTier,
          billingPrice.tiersMode,
        );
      }
      return entitlement.allocation * billingPrice.price;
    }

    if (
      entitlement.priceBehavior === EntitlementPriceBehavior.PayAsYouGo &&
      typeof entitlement.usage === "number" &&
      entitlement.usage > 0
    ) {
      return entitlement.usage * billingPrice.price;
    }

    if (
      entitlement.priceBehavior === EntitlementPriceBehavior.Overage &&
      typeof entitlement.usage === "number" &&
      entitlement.usage > 0
    ) {
      const overagePriceTier =
        billingPrice.priceTier[billingPrice.priceTier.length - 1];
      if (!overagePriceTier) {
        return;
      }

      let cost = 0;

      if (overagePriceTier.flatAmount) {
        cost += overagePriceTier.flatAmount;
      }

      if (overagePriceTier.perUnitPrice) {
        const amount = Math.max(
          0,
          entitlement.usage - (entitlement.softLimit ?? 0),
        );
        cost += amount * overagePriceTier.perUnitPrice;
      }

      return cost;
    }

    if (
      entitlement.priceBehavior === EntitlementPriceBehavior.Tier &&
      typeof entitlement.usage === "number" // a price needs to be displayed next to the tiered tooltip
    ) {
      return calculateTieredCost(
        entitlement.usage,
        billingPrice.priceTier,
        billingPrice.tiersMode,
      );
    }
  }
}

/**
 * Determines if billing address collection is required for tax purposes
 * based on the preview subscription finance response data.
 *
 * @param financeData - The finance response data from preview checkout
 * @returns true if billing address collection is needed for tax calculation
 */
export function isBillingAddressRequiredForTax(
  financeData?: PreviewSubscriptionFinanceResponseData | null,
): boolean {
  if (!financeData) {
    return false;
  }

  return financeData.taxRequireBillingDetails;
}

/**
 * Determines if billing address collection should be enabled based on
 * existing checkout settings and tax requirements.
 *
 * @param collectAddressSetting - Current collect address setting from checkout settings
 * @param financeData - The finance response data from preview checkout
 * @returns true if billing address collection should be enabled
 */
export function shouldCollectBillingAddress(
  collectAddressSetting: boolean,
  financeData?: PreviewSubscriptionFinanceResponseData | null,
): boolean {
  if (collectAddressSetting) {
    return true;
  }

  return isBillingAddressRequiredForTax(financeData);
}
