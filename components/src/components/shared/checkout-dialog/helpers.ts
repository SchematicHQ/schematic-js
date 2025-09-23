import type { PlanEntitlementResponseData } from "../../../api/checkoutexternal";
import { PriceBehavior } from "../../../const";

export interface OverageInfo {
  softLimit: number | null | undefined;
  perUnitPrice: number;
  currency: string;
  featureName: string | undefined;
}

/**
 * Finds the overage entitlement from a list of entitlements
 */
export function findOverageEntitlement(
  entitlements: PlanEntitlementResponseData[] | undefined,
): PlanEntitlementResponseData | undefined {
  if (!entitlements) return undefined;

  return entitlements.find(
    (entitlement) => entitlement.priceBehavior === PriceBehavior.Overage,
  );
}

/**
 * Extracts overage pricing information from an entitlement
 */
export function extractOverageInfo(
  overageEntitlement: PlanEntitlementResponseData | undefined,
  period: string,
  fallbackCurrency?: string,
): OverageInfo | null {
  if (!overageEntitlement) return null;

  const priceData =
    period === "year"
      ? overageEntitlement.meteredYearlyPrice
      : overageEntitlement.meteredMonthlyPrice;

  if (!priceData?.priceTier || priceData.priceTier.length < 2) {
    return null;
  }

  const overageTier = priceData.priceTier[priceData.priceTier.length - 1];

  return {
    softLimit: overageEntitlement.softLimit,
    perUnitPrice: overageTier.perUnitPriceDecimal
      ? Number(overageTier.perUnitPriceDecimal)
      : overageTier.perUnitPrice || 0,
    currency: priceData.currency || fallbackCurrency || "USD",
    featureName: overageEntitlement.feature?.name,
  };
}
