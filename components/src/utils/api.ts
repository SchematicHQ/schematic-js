import {
  type BillingPriceResponseData,
  type BillingPriceView,
  type CompanyPlanDetailResponseData,
  type ComponentHydrateResponseData,
  type FeatureDetailResponseData,
} from "../api/checkoutexternal";
import {
  type PlanViewPublicResponseData,
  type PublicPlansResponseData,
} from "../api/componentspublic";
import { VISIBLE_ENTITLEMENT_COUNT } from "../const";
import type { BillingPrice, Entitlement, Plan } from "../types";

import { pluralize } from "./pluralize";

export function isHydrateData(
  data?: unknown,
): data is PublicPlansResponseData | ComponentHydrateResponseData {
  return typeof data === "object" && data !== null && "activePlans" in data;
}

export function isCheckoutData(
  data?: unknown,
): data is ComponentHydrateResponseData {
  return typeof data === "object" && data !== null && "company" in data;
}

export function isHydratedPlan(
  plan?: Plan,
): plan is CompanyPlanDetailResponseData {
  return typeof plan !== "undefined" && "current" in plan;
}

export function getFeatureName(
  feature: Pick<
    FeatureDetailResponseData,
    "name" | "singularName" | "pluralName"
  >,
  count = 0,
) {
  const shouldBePlural = count === 0 || count > 1;
  const { name, singularName, pluralName } = feature;

  if (pluralName && shouldBePlural) {
    return pluralName;
  }

  if (singularName) {
    return shouldBePlural ? pluralize(singularName, count) : singularName;
  }

  return pluralize(name, count);
}

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

export function entitlementCountsReducer(
  acc: Record<
    string,
    | {
        size: number;
        limit: number;
      }
    | undefined
  >,
  plan: PlanViewPublicResponseData | CompanyPlanDetailResponseData,
) {
  acc[plan.id] = {
    size: plan.entitlements.length,
    limit: VISIBLE_ENTITLEMENT_COUNT,
  };

  return acc;
}
