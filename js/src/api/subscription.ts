import type {
  BillingCreditBundleView,
  CompanyDetailResponseData,
  CompanySubscriptionResponseData,
  ComponentDisplaySettings,
  ComponentHydrateResponseData,
  CreditCompanyGrantView,
  FeatureUsageResponseData,
  InvoiceResponseData,
  PlanDetailResponseData,
  ScheduledDowngradeResponseData,
} from "./checkoutexternal";

/**
 * The customer's current standing — active plan, subscription, payment
 * method, upcoming invoice, feature usage, credits, and trial/downgrade
 * state — as exposed by useSubscription. This is the company-scoped slice of
 * the hydrate response; its shape doubles as the draft contract for eventual
 * server-side derivation.
 */
export interface CustomerSubscription {
  company?: CompanyDetailResponseData;
  subscription?: CompanySubscriptionResponseData;
  upcomingInvoice?: InvoiceResponseData;
  features: FeatureUsageResponseData[];
  creditGrants: CreditCompanyGrantView[];
  creditBundles: BillingCreditBundleView[];
  defaultPlan?: PlanDetailResponseData;
  postTrialPlan?: PlanDetailResponseData;
  trialPaymentMethodRequired: boolean;
  scheduledDowngrade?: ScheduledDowngradeResponseData;
  displaySettings: ComponentDisplaySettings;
}

export function toSubscription(
  data: ComponentHydrateResponseData,
): CustomerSubscription {
  return {
    company: data.company,
    subscription: data.subscription,
    upcomingInvoice: data.upcomingInvoice,
    features: data.featureUsage?.features ?? [],
    creditGrants: data.creditGrants,
    creditBundles: data.creditBundles,
    defaultPlan: data.defaultPlan,
    postTrialPlan: data.postTrialPlan,
    trialPaymentMethodRequired: data.trialPaymentMethodRequired ?? false,
    scheduledDowngrade: data.scheduledDowngrade,
    displaySettings: data.displaySettings,
  };
}
