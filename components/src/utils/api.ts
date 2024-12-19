import type {
  FeatureUsageResponseData,
  PlanEntitlementResponseData,
} from "../api";

export function isUsageBasedEntitlement(
  entitlement: FeatureUsageResponseData | PlanEntitlementResponseData,
) {
  return (
    entitlement.priceBehavior === "pay_in_advance" ||
    entitlement.priceBehavior === "pay_as_you_go"
  );
}

export function isPayInAdvanceEntitlement(
  entitlement: FeatureUsageResponseData | PlanEntitlementResponseData,
) {
  return entitlement.priceBehavior === "pay_in_advance";
}

export function isPayAsYouGoEntitlement(
  entitlement: FeatureUsageResponseData | PlanEntitlementResponseData,
) {
  return entitlement.priceBehavior === "pay_as_you_go";
}
