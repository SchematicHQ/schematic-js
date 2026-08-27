import {
  type BillingCreditBundleView,
  type BillingPriceResponseData,
  type BillingPriceView,
  type BillingProductPriceTierResponseData,
  type CompanyPlanCreditGrantView,
  type CompanyPlanDetailResponseData,
  type ComponentHydrateResponseData,
  type CreditCompanyGrantView,
  type FeatureResponseData,
  type FeatureUsageResponseData,
  type PlanEntitlementResponseData,
} from "../api/checkoutexternal";
import { type PublicPlansResponseData } from "../api/componentspublic";

export type HydrateData =
  PublicPlansResponseData | ComponentHydrateResponseData;

export type HydrateDataWithCompanyContext = ComponentHydrateResponseData;

export type BillingPrice = BillingPriceView | BillingPriceResponseData;

export type Plan = CompanyPlanDetailResponseData;
export type SelectedPlan = Plan & { isSelected: boolean };

export type AutoTopupConfig = Pick<
  CompanyPlanCreditGrantView,
  | "companyAutoTopupEnabled"
  | "companyAutoTopupThresholdCredits"
  | "companyAutoTopupAmount"
>;

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

export interface PerLicenseCreditGrant {
  /** credits granted per unit of the license */
  amount: number;
  /**
   * The license whose quantity scales the grant. Undefined when the grant
   * declares per-license scaling without naming a license: the per-unit copy
   * still holds, but no effective total can be resolved from it.
   */
  licenseId?: string;
}

export type Credit = Omit<
  CreditWithCompanyContext,
  "companyId" | "companyName" | "bundleId" | "total" | "grants"
> & {
  period?: string;
  /** flat (company-level) portion of the plan's grants on this credit */
  fixedQuantity: number;
  /** per-license portions; effective amount = amount × license quantity */
  perLicenseGrants: PerLicenseCreditGrant[];
};

export type CreditBundle = BillingCreditBundleView & { count: number };

export type Feature = FeatureResponseData;

export type Entitlement =
  PlanEntitlementResponseData | FeatureUsageResponseData;

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
