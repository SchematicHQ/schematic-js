import type { FeatureUsageResponseData } from "../../../api/checkoutexternal";
import type { CurrentUsageBasedEntitlement } from "../../../types";

export function extractCurrentUsageBasedEntitlements(
  features: Array<FeatureUsageResponseData> = [],
  planPeriod: string,
): CurrentUsageBasedEntitlement[] {
  return features.reduce((acc: CurrentUsageBasedEntitlement[], entitlement) => {
    if (
      entitlement.priceBehavior &&
      ((planPeriod === "month" && entitlement.monthlyUsageBasedPrice) ||
        (planPeriod === "year" && entitlement.yearlyUsageBasedPrice))
    ) {
      const allocation = entitlement.allocation || 0;
      const usage = entitlement.usage || 0;
      const quantity = allocation ?? usage;
      acc.push({
        ...entitlement,
        allocation,
        usage,
        quantity,
      });
    }
    return acc;
  }, []);
}
