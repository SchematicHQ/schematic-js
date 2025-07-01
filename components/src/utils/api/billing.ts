import {
  type BillingPriceResponseData,
  type BillingPriceView,
  type FeatureUsageResponseData,
} from "../../api/checkoutexternal";
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

    if (entitlement.priceBehavior === "overage") {
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
      entitlement.priceBehavior === "pay_in_advance" &&
      entitlement.allocation
    ) {
      return entitlement.allocation * billingPrice.price;
    }

    if (entitlement.priceBehavior === "pay_as_you_go" && entitlement.usage) {
      return entitlement.usage * billingPrice.price;
    }

    if (entitlement.priceBehavior === "overage" && entitlement.usage) {
      const overagePriceTier = billingPrice.priceTier.at(-1);
      if (!overagePriceTier) {
        return;
      }

      let cost = 0;

      if (overagePriceTier.flatAmount) {
        cost += overagePriceTier.flatAmount;
      }

      if (overagePriceTier.perUnitPrice) {
        cost += entitlement.usage * overagePriceTier.perUnitPrice;
      }

      return cost;
    }

    if (entitlement.priceBehavior === "tier" && entitlement.usage) {
      let cost = 0;
      let usage = entitlement.usage;

      for (let i = 0; i < billingPrice.priceTier.length; i++) {
        const tier = billingPrice.priceTier[i];

        if (typeof tier.upTo === "number" && usage > 0) {
          const amount = usage > tier.upTo ? tier.upTo : usage;

          if (typeof tier.flatAmount === "number") {
            cost += tier.flatAmount;
          }

          if (typeof tier.perUnitPrice === "number") {
            cost += amount * tier.perUnitPrice;
          }

          usage -= amount;
        }
      }

      return cost;
    }
  }
}
