import {
  type BillingCreditBundleView,
  type BillingPriceResponseData,
  type BillingPriceView,
  type BillingProductPriceTierResponseData,
  type CompanyPlanDetailResponseData,
  type ComponentHydrateResponseData,
  type FeatureDetailResponseData,
  type FeatureResponseData,
  type FeatureUsageResponseData,
  type PlanEntitlementResponseData,
} from "../api/checkoutexternal";
import {
  type PlanViewPublicResponseData,
  type PublicPlansResponseData,
} from "../api/componentspublic";

export type HydrateData =
  | PublicPlansResponseData
  | ComponentHydrateResponseData;

export type BillingPrice = BillingPriceView | BillingPriceResponseData;

export type Plan = CompanyPlanDetailResponseData | PlanViewPublicResponseData;
export type SelectedPlan = Plan & { isSelected: boolean };

export type CreditBundle = BillingCreditBundleView & { count: number };

export type Feature = FeatureDetailResponseData | FeatureResponseData;

export type Entitlement =
  | PlanEntitlementResponseData
  | FeatureUsageResponseData;

export interface UsageBasedEntitlement extends PlanEntitlementResponseData {
  allocation: number;
  usage: number;
  quantity: number;
}

export interface CurrentUsageBasedEntitlement extends FeatureUsageResponseData {
  allocation: number;
  usage: number;
  quantity: number;
}

export type PriceTier = Omit<BillingProductPriceTierResponseData, "upTo"> & {
  from?: number;
  to?: number;
};
