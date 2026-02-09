import {
  type BillingCreditBundleView,
  type BillingPriceResponseData,
  type BillingPriceView,
  type BillingProductPriceTierResponseData,
  type CompanyPlanDetailResponseData,
  type ComponentHydrateResponseData,
  type CreditCompanyGrantView,
  type FeatureDetailResponseData,
  type FeatureResponseData,
  type FeatureUsageResponseData,
  type PlanEntitlementResponseData,
} from "../api/checkoutexternal";
import { type PublicPlansResponseData } from "../api/componentspublic";

export type HydrateData =
  | PublicPlansResponseData
  | ComponentHydrateResponseData;

export type HydrateDataWithCompanyContext = ComponentHydrateResponseData;

export type BillingPrice = BillingPriceView | BillingPriceResponseData;

export type Plan = CompanyPlanDetailResponseData;
export type SelectedPlan = Plan & { isSelected: boolean };

export interface CreditWithCompanyContext {
  id: CreditCompanyGrantView["billingCreditId"];
  name: CreditCompanyGrantView["creditName"];
  singularName: CreditCompanyGrantView["singularName"];
  pluralName: CreditCompanyGrantView["pluralName"];
  description: CreditCompanyGrantView["creditDescription"];
  icon: CreditCompanyGrantView["creditIcon"];
  grantReason: CreditCompanyGrantView["grantReason"];
  quantity: CreditCompanyGrantView["quantity"];
  companyId: CreditCompanyGrantView["companyId"];
  companyName: CreditCompanyGrantView["companyName"];
  planId: CreditCompanyGrantView["planId"];
  planName: CreditCompanyGrantView["planName"];
  bundleId: CreditCompanyGrantView["billingCreditBundleId"];
  total: {
    value: number;
    remaining: number;
    used: number;
  };
  grants: CreditCompanyGrantView[];
}

export type Credit = Omit<
  CreditWithCompanyContext,
  "companyId" | "companyName" | "bundleId" | "total" | "grants"
> & { period?: string };

export type CreditBundle = BillingCreditBundleView & { count: number };

export type Feature = FeatureDetailResponseData | FeatureResponseData;

export type Entitlement =
  | PlanEntitlementResponseData
  | FeatureUsageResponseData;

export type SharedEntitlementUsageProps = {
  allocation: number;
  usage: number;
  quantity: number;
};
export type UsageBasedEntitlement = PlanEntitlementResponseData &
  SharedEntitlementUsageProps;
export type CurrentUsageBasedEntitlement = FeatureUsageResponseData &
  SharedEntitlementUsageProps;

export type PriceTier = Omit<BillingProductPriceTierResponseData, "upTo"> & {
  from?: number;
  to?: number;
};
