import {
  type BillingPriceResponseData,
  type BillingPriceView,
} from "../../api/checkoutexternal";
import type { BillingPrice, Entitlement, Plan } from "../../types";

export const ChargeType = {
  oneTime: "one_time",
  recurring: "recurring",
  free: "free",
};

function getPriceValue(billingPrice: BillingPrice): number {
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
      const [, overagePriceTier] = billingPrice.priceTier;

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
