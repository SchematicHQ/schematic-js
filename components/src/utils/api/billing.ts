import {
  type BillingPriceResponseData,
  type BillingPriceView,
  type FeatureUsageResponseData,
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

export function getPlanPrice(
  plan: Plan,
  period = "month",
): BillingPriceResponseData | undefined {
  const billingPrice = period === "year" ? plan.yearlyPrice : plan.monthlyPrice;

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
      let cost = 0;
      let usage = entitlement.usage;

      if (billingPrice.tiersMode === "volume") {
        let start = 0;
        const currentTier = billingPrice.priceTier.find((tier) => {
          const end = tier.upTo ?? Infinity;
          const isCurrentTier = usage >= start && usage <= end;
          start = end + 1;

          return isCurrentTier;
        });

        if (usage > 0) {
          const flatAmount = currentTier?.flatAmount ?? 0;
          const perUnitPrice = currentTier?.perUnitPrice ?? 0;

          cost += usage * perUnitPrice + (flatAmount ?? 0);
        }
      } else {
        // default to graduated tiers mode
        for (let i = 0; i < billingPrice.priceTier.length; i++) {
          const tier = billingPrice.priceTier[i];
          const flatAmount = tier.flatAmount ?? 0;
          const perUnitPrice = tier.perUnitPrice ?? 0;

          if (typeof tier.upTo === "number" && usage > 0) {
            const amount = usage > tier.upTo ? tier.upTo : usage;

            cost += flatAmount;
            cost += amount * perUnitPrice;

            usage -= amount;
          }
        }
      }

      return cost;
    }
  }
}
