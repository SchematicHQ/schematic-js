// Headless controller + context for the PlanManager primitive.
//
// Lifts the (substantial) derived state the container owned: current plan /
// add-ons / credit groupings, subscription interval & status flags, trial and
// custom-plan billing notices, and the change-plan / edit-auto-topup actions.

import * as React from "react";

import { BillingCreditGrantReason } from "../../api/checkoutexternal";
import {
  useCustomPlanBilling,
  useEmbed,
  useTrialEnd,
} from "../../hooks";
import type { CreditWithCompanyContext } from "../../types";
import { getSubscriptionPeriod, groupCreditGrants } from "../../utils";
import { createPrimitiveContext } from "../internal";

type EmbedData = NonNullable<ReturnType<typeof useEmbed>["data"]>;
type Company = NonNullable<EmbedData["company"]>;
type FeatureUsage = NonNullable<EmbedData["featureUsage"]>["features"][number];

export interface PlanManagerCreditGroups {
  plan: CreditWithCompanyContext[];
  bundles: CreditWithCompanyContext[];
  promotional: CreditWithCompanyContext[];
}

export interface PlanManagerContextValue {
  currentPlan?: Company["plan"];
  currentAddOns: Company["addOns"];
  creditBundles: EmbedData["creditBundles"];
  creditGroups: PlanManagerCreditGroups;
  billingSubscription?: Company["billingSubscription"];
  canCheckout: boolean;
  postTrialPlan?: EmbedData["postTrialPlan"];
  featureUsage: FeatureUsage[];
  usageBasedEntitlements: FeatureUsage[];
  showCredits: boolean;
  showZeroPriceAsFree: boolean;
  trialPaymentMethodRequired: boolean;
  scheduledDowngrade?: Company["scheduledDowngrade"];
  subscriptionInterval?: string;
  subscriptionCurrency?: string;
  willSubscriptionCancel: boolean;
  isTrialSubscription: boolean;
  currentPlanPeriod?: string;
  isFreePlan: boolean;
  isUsageBasedPlan: boolean;
  hasAutoTopupSelfService: boolean;
  customPlanBilling: ReturnType<typeof useCustomPlanBilling>;
  trialEnd: ReturnType<typeof useTrialEnd>;
  /** Opens the checkout layout to change plan. */
  changePlan: () => void;
  /** Opens checkout to edit auto top-up settings. */
  editAutoTopup: () => void;
}

const [PlanManagerProvider, usePlanManagerContext, PlanManagerContext] =
  createPrimitiveContext<PlanManagerContextValue>("PlanManager");

export { PlanManagerContext, PlanManagerProvider };

/** Consumer-facing hook. Throws outside `PlanManager.Root`. */
export function usePlanManager(): PlanManagerContextValue {
  return usePlanManagerContext("usePlanManager");
}

export function usePlanManagerController(): PlanManagerContextValue {
  const { data, setCheckoutState, setLayout } = useEmbed();

  const trialEnd = useTrialEnd();
  const customPlanBilling = useCustomPlanBilling();

  const {
    currentPlan,
    currentAddOns,
    creditBundles,
    creditGroups,
    billingSubscription,
    canCheckout,
    postTrialPlan,
    featureUsage,
    showCredits,
    showZeroPriceAsFree,
    trialPaymentMethodRequired,
  } = React.useMemo(() => {
    return {
      currentPlan: data?.company?.plan,
      currentAddOns: data?.company?.addOns || [],
      creditBundles: data?.creditBundles || [],
      creditGroups: groupCreditGrants(data?.creditGrants || [], {
        groupBy: "bundle",
      }).reduce(
        (acc: PlanManagerCreditGroups, grant) => {
          switch (grant.grantReason) {
            case BillingCreditGrantReason.Plan:
              acc.plan.push(grant);
              break;
            case BillingCreditGrantReason.Purchased:
              acc.bundles.push(grant);
              break;
            case BillingCreditGrantReason.Free:
              acc.promotional.push(grant);
          }

          return acc;
        },
        { plan: [], bundles: [], promotional: [] },
      ),
      billingSubscription: data?.company?.billingSubscription,
      canCheckout: data?.capabilities?.checkout ?? false,
      postTrialPlan: data?.postTrialPlan,
      featureUsage: data?.featureUsage?.features || [],
      trialPaymentMethodRequired: data?.trialPaymentMethodRequired ?? false,
      showCredits: data?.displaySettings?.showCredits ?? true,
      showZeroPriceAsFree: data?.displaySettings?.showZeroPriceAsFree ?? false,
    };
  }, [
    data?.capabilities?.checkout,
    data?.company?.addOns,
    data?.company?.billingSubscription,
    data?.company?.plan,
    data?.creditBundles,
    data?.creditGrants,
    data?.featureUsage?.features,
    data?.postTrialPlan,
    data?.displaySettings?.showCredits,
    data?.displaySettings?.showZeroPriceAsFree,
    data?.trialPaymentMethodRequired,
  ]);

  const usageBasedEntitlements = React.useMemo(
    () =>
      featureUsage.filter((usage) => typeof usage.priceBehavior === "string"),
    [featureUsage],
  );

  const {
    subscriptionInterval,
    subscriptionCurrency,
    willSubscriptionCancel,
    isTrialSubscription,
  } = React.useMemo(() => {
    const subscriptionInterval =
      getSubscriptionPeriod(billingSubscription) ??
      billingSubscription?.interval;
    const subscriptionCurrency = billingSubscription?.currency;
    const isTrialSubscription = billingSubscription?.status === "trialing";
    const willSubscriptionCancel =
      typeof billingSubscription?.cancelAt === "number" &&
      billingSubscription?.cancelAtPeriodEnd === true;

    return {
      subscriptionInterval,
      subscriptionCurrency,
      isTrialSubscription,
      willSubscriptionCancel,
    };
  }, [billingSubscription]);

  const currentPlanPeriod =
    getSubscriptionPeriod(billingSubscription) ??
    currentPlan?.planPeriod ??
    undefined;

  const { isFreePlan, isUsageBasedPlan } = React.useMemo(() => {
    const isFreePlan = currentPlan?.planPrice === 0;
    const isUsageBasedPlan = isFreePlan && usageBasedEntitlements.length > 0;
    return { isFreePlan, isUsageBasedPlan };
  }, [currentPlan, usageBasedEntitlements]);

  const hasAutoTopupSelfService =
    currentPlan?.includedCreditGrants.some((grant) => {
      return grant.billingCreditAutoTopupSelfService;
    }) ?? false;

  return {
    currentPlan,
    currentAddOns,
    creditBundles,
    creditGroups,
    billingSubscription,
    canCheckout,
    postTrialPlan,
    featureUsage,
    usageBasedEntitlements,
    showCredits,
    showZeroPriceAsFree,
    trialPaymentMethodRequired,
    scheduledDowngrade: data?.company?.scheduledDowngrade,
    subscriptionInterval,
    subscriptionCurrency,
    willSubscriptionCancel,
    isTrialSubscription,
    currentPlanPeriod,
    isFreePlan,
    isUsageBasedPlan,
    hasAutoTopupSelfService,
    customPlanBilling,
    trialEnd,
    changePlan: () => setLayout("checkout"),
    editAutoTopup: () => {
      setCheckoutState({ bypassPlanSelection: true });
      setLayout("checkout");
    },
  };
}
