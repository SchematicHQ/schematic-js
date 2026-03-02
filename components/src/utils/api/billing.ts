import {
  type BillingPriceResponseData,
  type BillingPriceView,
  type BillingProductPriceTierResponseData,
  type FeatureUsageResponseData,
  type PreviewSubscriptionFinanceResponseData,
} from "../../api/checkoutexternal";
import { PriceBehavior } from "../../const";
import type { BillingPrice, Entitlement, Plan } from "../../types";

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

export function getPlanPrice(
  plan: Plan,
  period = "month",
  options: PlanPriceOptions = { useSelectedPeriod: true },
): BillingPriceResponseData | undefined {
  const billingPrice = options.useSelectedPeriod
    ? period === "year"
      ? plan.yearlyPrice
      : plan.monthlyPrice
    : plan.yearlyPrice && !plan.monthlyPrice
      ? plan.yearlyPrice
      : plan.monthlyPrice;

  if (billingPrice) {
    return { ...billingPrice, price: getPriceValue(billingPrice) };
  }
}

export function getAddOnPrice(
  addOn: Plan,
  period = "month",
): BillingPriceResponseData | undefined {
  const billingPrice =
    addOn.chargeType === ChargeType.oneTime
      ? addOn.oneTimePrice
      : period === "year"
        ? addOn.yearlyPrice
        : addOn.monthlyPrice;

  if (billingPrice) {
    return { ...billingPrice, price: getPriceValue(billingPrice) };
  }
}

export function getEntitlementPrice(
  entitlement: Entitlement,
  period = "month",
): BillingPriceView | undefined {
  let source: BillingPriceView | undefined;
  if ("valueType" in entitlement) {
    // entitlement
    source =
      period === "year"
        ? entitlement.meteredYearlyPrice
        : entitlement.meteredMonthlyPrice;
  } else if ("entitlementType" in entitlement) {
    // feature usage
    source =
      period === "year"
        ? entitlement.yearlyUsageBasedPrice
        : entitlement.monthlyUsageBasedPrice;
  }

  if (source) {
    const billingPrice = { ...source };

    if (entitlement.priceBehavior === PriceBehavior.Overage) {
      const overagePriceTier =
        billingPrice.priceTier[billingPrice.priceTier.length - 1];

      if (typeof overagePriceTier.perUnitPrice === "number") {
        billingPrice.price = overagePriceTier.perUnitPrice;
      }

      if (typeof overagePriceTier.perUnitPriceDecimal === "string") {
        billingPrice.priceDecimal = overagePriceTier.perUnitPriceDecimal;
      }
    }

    return { ...billingPrice, price: getPriceValue(billingPrice) };
  }
}

export function isTieredPrice(billingPrice?: BillingPriceView): boolean {
  if (!billingPrice) return false;
  return billingPrice.priceTier.length > 1 || !!billingPrice.tiersMode;
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
): number | undefined {
  const source =
    period === "year"
      ? entitlement.yearlyUsageBasedPrice
      : entitlement.monthlyUsageBasedPrice;

  if (source) {
    const billingPrice: BillingPriceView = { ...source };

    if (
      entitlement.priceBehavior === PriceBehavior.PayInAdvance &&
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
      entitlement.priceBehavior === PriceBehavior.PayAsYouGo &&
      typeof entitlement.usage === "number" &&
      entitlement.usage > 0
    ) {
      return entitlement.usage * billingPrice.price;
    }

    if (
      entitlement.priceBehavior === PriceBehavior.Overage &&
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
      entitlement.priceBehavior === PriceBehavior.Tiered &&
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
