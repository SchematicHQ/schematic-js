import {
  type BillingPriceResponseData,
  type BillingPriceView,
  type CompanyPlanDetailResponseData,
  type FeatureUsageResponseData,
  type PlanEntitlementResponseData,
} from "../api/checkoutexternal";
import { type PlanViewPublicResponseData } from "../api/componentspublic";

export type BillingPrice = BillingPriceView | BillingPriceResponseData;

export type Plan = CompanyPlanDetailResponseData | PlanViewPublicResponseData;

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
