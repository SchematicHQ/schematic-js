import { useMemo } from "react";

import {
  type BillingPriceView,
  type FeatureUsageResponseData,
} from "../api/checkoutexternal";
import { getEntitlementCost } from "../utils";

export interface EntitlementProps extends FeatureUsageResponseData {
  billingPrice?: BillingPriceView;
  limit?: number;
  amount?: number;
  cost?: number;
}

export function useEntitlement(
  entitlement: FeatureUsageResponseData,
  period?: string,
) {
  return useMemo<EntitlementProps>(() => {
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
      entitlement.priceBehavior === "pay_in_advance" &&
      entitlement.allocation
    ) {
      limit = entitlement.allocation;
    } else if (
      entitlement.priceBehavior === "overage" &&
      entitlement.softLimit
    ) {
      limit = entitlement.softLimit;
    }

    // amount related to cost
    let amount: number | undefined;
    if (
      entitlement.priceBehavior === "pay_in_advance" &&
      entitlement.allocation
    ) {
      amount = entitlement.allocation;
    } else if (
      (entitlement.priceBehavior === "pay_as_you_go" ||
        entitlement.priceBehavior === "tier") &&
      entitlement.usage
    ) {
      amount = entitlement.usage;
    } else if (
      entitlement.priceBehavior === "overage" &&
      entitlement.usage &&
      entitlement.softLimit
    ) {
      amount = Math.max(0, entitlement.usage - entitlement.softLimit);
    }

    // total cost based on current usage or allocation
    const cost = getEntitlementCost(entitlement, period);

    return { ...entitlement, billingPrice, limit, amount, cost };
  }, [entitlement, period]);
}
