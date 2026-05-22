import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";

import {
  BillingProductPriceInterval,
  CompanyPlanCreditGrantView,
  EntitlementPriceBehavior,
  ResponseError,
  type FeatureUsageResponseData,
  type PlanEntitlementResponseData,
  type PreviewSubscriptionFinanceResponseData,
} from "../../../api/checkoutexternal";
import { DEFAULT_CURRENCY, TEXT_BASE_SIZE } from "../../../const";
import {
  useAvailableCurrenciesWithInvalid,
  useAvailablePlans,
  useEmbed,
  useIsLightBackground,
  useSubscriptionCurrency,
} from "../../../hooks";
import type {
  AutoTopupConfig,
  CreditBundle,
  SelectedPlan,
  UsageBasedEntitlement,
} from "../../../types";
import {
  ERROR_UNKNOWN,
  buildAddOnRequestBody,
  buildAutoTopupRequestBody,
  buildCreditBundlesRequestBody,
  buildPayInAdvanceRequestBody,
  getAddOnPrice,
  getPlanPrice,
  getSubscriptionPeriod,
  isError,
  isScheduledCheckoutConflictMessage,
  mergeCompanyGrants,
  planSupportsCurrency,
} from "../../../utils";
import {
  CurrencyToggle,
  InvalidCurrencyNotice,
  PeriodToggle,
  SubscriptionSidebar,
} from "../../shared";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  Flex,
  Loader,
  Overlay,
  Text,
} from "../../ui";

import { Navigation } from "./Navigation";

import { AddOns, AutoTopup, Checkout, Credits, Plan, Quantity } from ".";

export const createActiveUsageBasedEntitlementsReducer =
  (entitlements: FeatureUsageResponseData[], period: string) =>
  (acc: UsageBasedEntitlement[], entitlement: PlanEntitlementResponseData) => {
    const hasCurrencyPrice = entitlement.currencyPrices?.some(
      (cp) =>
        (period === "month" && cp.monthlyPrice) ||
        (period === "quarter" && cp.quarterlyPrice) ||
        (period === "year" && cp.yearlyPrice),
    );
    if (
      entitlement.priceBehavior &&
      ((period === "month" && entitlement.meteredMonthlyPrice) ||
        (period === "quarter" && entitlement.meteredQuarterlyPrice) ||
        (period === "year" && entitlement.meteredYearlyPrice) ||
        hasCurrencyPrice)
    ) {
      const featureUsage = entitlements.find(
        (usage) => usage.feature?.id === entitlement.feature?.id,
      );
      const allocation =
        featureUsage?.allocation ?? entitlement.valueNumeric ?? 0;
      const usage = featureUsage?.usage ?? 0;
      const quantity =
        entitlement.priceBehavior === EntitlementPriceBehavior.PayInAdvance
          ? allocation
          : 0;

      acc.push({
        ...entitlement,
        allocation,
        usage,
        quantity,
      });
    }

    return acc;
  };

export interface CheckoutStage {
  id: string;
  name: string;
  label?: string;
  description?: string;
}

interface CheckoutDialogProps {
  top?: number;
}

interface ConfirmPaymentIntentProps {
  clientSecret: string;
  callback: (confirmed: boolean) => void;
}

export const CheckoutDialog = ({ top }: CheckoutDialogProps) => {
  const { t } = useTranslation();

  const {
    data,
    layout,
    settings,
    isPending,
    checkoutState,
    clearCheckoutState,
    setCheckoutState,
    previewCheckout,
    setLayout,
    currencyFilter,
    debug,
  } = useEmbed();

  const isLightBackground = useIsLightBackground();

  const dialogRef = useRef<HTMLDialogElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const [dialogElement, setDialogElement] = useState<HTMLDialogElement | null>(
    null,
  );
  const setDialog = useCallback((element: HTMLDialogElement | null) => {
    dialogRef.current = element;
    setDialogElement(element);
  }, []);

  const [confirmPaymentIntentProps, setConfirmPaymentIntentProps] = useState<
    ConfirmPaymentIntentProps | undefined | null
  >(undefined);

  const [charges, setCharges] =
    useState<PreviewSubscriptionFinanceResponseData>();

  const [paymentMethodId, setPaymentMethodId] = useState<string | undefined>(
    () => {
      return (
        data?.subscription?.paymentMethod?.externalId ||
        data?.company?.defaultPaymentMethod?.externalId
      );
    },
  );

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [isModal, setIsModal] = useState(true);

  const showPeriodToggle = data?.displaySettings?.showPeriodToggle ?? true;
  const trialPaymentMethodRequired = data?.trialPaymentMethodRequired === true;

  const featureUsage = useMemo(
    () => data?.featureUsage?.features ?? [],
    [data?.featureUsage?.features],
  );

  // Validates the requested period against the plan's availability.
  // Note: Plan data must be loaded by the time CheckoutDialog mounts.
  const getValidatedPeriod = () => {
    const requestedPeriod =
      checkoutState?.period ||
      getSubscriptionPeriod(data?.company?.billingSubscription) ||
      data?.company?.plan?.planPeriod ||
      "month";

    // If a specific plan is requested, validate the period against that plan's availability
    if (checkoutState?.planId) {
      const requestedPlan = data?.activePlans?.find(
        (plan) => plan.id === checkoutState.planId,
      );

      if (requestedPlan) {
        const planSupportsRequestedPeriod =
          (requestedPeriod === "month" && requestedPlan.monthlyPrice) ||
          (requestedPeriod === "quarter" && requestedPlan.quarterlyPrice) ||
          (requestedPeriod === "year" && requestedPlan.yearlyPrice);

        if (!planSupportsRequestedPeriod) {
          // Fall back to the period the plan does support
          if (requestedPlan.yearlyPrice) return "year";
          if (requestedPlan.quarterlyPrice) return "quarter";
          if (requestedPlan.monthlyPrice) return "month";
        }
      }
    }

    return requestedPeriod;
  };

  const [planPeriod, setPlanPeriod] = useState(getValidatedPeriod);

  const { currencies, invalidFilterEntries } =
    useAvailableCurrenciesWithInvalid();
  const lockedCurrency = useSubscriptionCurrency();
  const hasCurrencyFilter = !!currencyFilter && currencyFilter.length > 0;
  const filterBlocksSubscriptionCurrency =
    hasCurrencyFilter &&
    !!lockedCurrency &&
    !currencyFilter!.includes(lockedCurrency);
  const [selectedCurrency, setSelectedCurrency] = useState(
    () =>
      (checkoutState?.selectedCurrency &&
      currencies.includes(checkoutState.selectedCurrency)
        ? checkoutState.selectedCurrency
        : undefined) ??
      currencies[0] ??
      DEFAULT_CURRENCY,
  );
  const effectiveCurrency = lockedCurrency ?? selectedCurrency;
  const showCurrencySelector = currencies.length > 1 && !lockedCurrency;
  const hasCurrency =
    !!lockedCurrency || currencies.length > 1 || hasCurrencyFilter;
  const hasNoUsableCurrency = !lockedCurrency && currencies.length === 0;

  useEffect(() => {
    if (filterBlocksSubscriptionCurrency) {
      console.error(
        `[Schematic] currencyFilter excludes the active subscription currency (${lockedCurrency}); keeping subscription currency.`,
      );
      debug("currencyFilter conflicts with subscription currency", {
        lockedCurrency,
      });
    }
  }, [filterBlocksSubscriptionCurrency, lockedCurrency, debug]);

  const {
    plans: availablePlans,
    addOns: availableAddOns,
    periods: availablePeriods,
  } = useAvailablePlans(planPeriod, {
    useSelectedPeriod: showPeriodToggle,
  });

  const [selectedPlanId, setSelectedPlanId] = useState<
    string | null | undefined
  >(undefined);

  const selectedPlan = useMemo<SelectedPlan | undefined>(() => {
    if (selectedPlanId === null) {
      return undefined;
    }

    if (selectedPlanId) {
      return availablePlans.find((p) => p.id === selectedPlanId);
    }

    if (checkoutState?.planId) {
      return availablePlans.find((plan) => plan.id === checkoutState.planId);
    }

    return availablePlans.find(
      (plan) =>
        plan.current &&
        // do not initially set the current plan for a trial
        (!plan.isTrialable || !plan.companyCanTrial),
    );
  }, [availablePlans, checkoutState, selectedPlanId]);

  const [shouldTrial, setShouldTrial] = useState(false);

  const planCreditGrants = useMemo(() => {
    const grants = mergeCompanyGrants(
      selectedPlan?.includedCreditGrants,
      data?.company?.plan?.includedCreditGrants,
    );

    return grants;
  }, [
    selectedPlan?.includedCreditGrants,
    data?.company?.plan?.includedCreditGrants,
  ]);

  const [autoTopupConfigs, setAutoTopupConfigs] = useState<
    Map<string, AutoTopupConfig>
  >(() => {
    const initialConfigs = data?.company?.plan?.includedCreditGrants.reduce(
      (
        acc: [id: string, config: AutoTopupConfig][],
        companyGrant: CompanyPlanCreditGrantView,
      ) => {
        const {
          companyAutoTopupEnabled = false,
          companyAutoTopupThresholdCredits,
          companyAutoTopupAmount,
        } = companyGrant;

        const config: AutoTopupConfig = {
          companyAutoTopupEnabled,
          companyAutoTopupThresholdCredits,
          companyAutoTopupAmount,
        };

        acc.push([companyGrant.id, config]);

        return acc;
      },
      [],
    );

    return new Map(initialConfigs);
  });

  const [selectedAddOnIds, setSelectedAddOnIds] = useState<Set<string>>(() => {
    const ids = new Set<string>();

    if (checkoutState?.addOnIds) {
      for (const id of checkoutState.addOnIds) ids.add(id);
    }

    if (typeof checkoutState?.addOnId !== "undefined") {
      if (checkoutState.addOnId !== null) {
        ids.add(checkoutState.addOnId);
      }
    } else {
      for (const addOn of data?.company?.addOns || []) {
        ids.add(addOn.id);
      }
    }

    return ids;
  });

  const addOns = useMemo(() => {
    return availableAddOns
      .filter((availAddOn) => {
        // Drop add-ons that don't offer the in-play currency. The currency
        // is pinned to lockedCurrency (the active subscription) when one
        // exists, so this also hides add-ons incompatible with a fixed
        // subscription currency. We only filter when there's a meaningful
        // currency choice — otherwise legacy single-currency setups would
        // disappear unexpectedly.
        if (
          hasCurrency &&
          !planSupportsCurrency(availAddOn, effectiveCurrency)
        ) {
          return false;
        }

        if (!selectedPlan) {
          return true;
        }

        const ourCompats = data?.addOnCompatibilities.find(
          (compat) => compat.sourcePlanId === availAddOn.id,
        );

        if (!ourCompats || !ourCompats.compatiblePlanIds?.length) {
          return true;
        }

        return ourCompats?.compatiblePlanIds.includes(selectedPlan?.id);
      })
      .map((addOn) => ({
        ...addOn,
        isSelected: selectedAddOnIds.has(addOn.id),
      }));
  }, [
    data?.addOnCompatibilities,
    availableAddOns,
    selectedPlan,
    hasCurrency,
    effectiveCurrency,
    selectedAddOnIds,
  ]);

  const [creditBundles, setCreditBundles] = useState<CreditBundle[]>(() => {
    return (data?.creditBundles || []).map((bundle) => ({
      ...bundle,
      count: 0,
    }));
  });

  const selectedPlanPriceId = useMemo(() => {
    if (!selectedPlan) {
      return undefined;
    }

    const currencyPrice = getPlanPrice(
      selectedPlan,
      planPeriod,
      { useSelectedPeriod: true },
      hasCurrency ? effectiveCurrency : undefined,
    );

    return (
      currencyPrice?.id ??
      (planPeriod === "year"
        ? selectedPlan.yearlyPrice?.id
        : planPeriod === "quarter"
          ? selectedPlan.quarterlyPrice?.id
          : selectedPlan.monthlyPrice?.id)
    );
  }, [selectedPlan, planPeriod, hasCurrency, effectiveCurrency]);

  // Whether the company already had a payment method when the dialog opened.
  // Captured once at mount (lazy useState init) so entering a card mid-flow
  // doesn't retroactively drop the checkout stage the user is standing on.
  const [hasInitialPaymentMethod] = useState(
    () =>
      !!(
        data?.subscription?.paymentMethod?.externalId ||
        data?.company?.defaultPaymentMethod?.externalId
      ),
  );

  // A credit-bundle-only purchase on a free/non-billing subscription: there is
  // no subscription to create or change, so the backend charges for the credits
  // standalone. Mirrors the API's isCreditBundleOnlyCheckout (bundles present,
  // no add-ons / pay-in-advance, empty or non-billing plan), gated on the
  // company having no active billing subscription.
  const isCreditOnlyPurchase = useMemo(() => {
    if (data?.company?.billingSubscription) {
      return false;
    }

    if (selectedPlanPriceId) {
      return false;
    }

    if (!creditBundles.some((bundle) => bundle.count > 0)) {
      return false;
    }

    const hasPaidAddOn = addOns.some(
      (addOn) =>
        addOn.isSelected &&
        !!getAddOnPrice(
          addOn,
          planPeriod,
          hasCurrency ? effectiveCurrency : undefined,
        )?.id,
    );

    return !hasPaidAddOn;
  }, [
    data?.company?.billingSubscription,
    selectedPlanPriceId,
    creditBundles,
    addOns,
    planPeriod,
    hasCurrency,
    effectiveCurrency,
  ]);

  const [usageBasedEntitlements, setUsageBasedEntitlements] = useState(() =>
    (selectedPlan?.entitlements || []).reduce(
      createActiveUsageBasedEntitlementsReducer(featureUsage, planPeriod),
      [],
    ),
  );

  const [addOnUsageBasedEntitlements, setAddOnUsageBasedEntitlements] =
    useState<UsageBasedEntitlement[]>(() => {
      // Get entitlements from currently active add-ons
      const currentAddOnEntitlements = (data?.company?.addOns || []).flatMap(
        (currentAddOn) => {
          const availableAddOn = availableAddOns.find(
            (available) => available.id === currentAddOn.id,
          );

          if (!availableAddOn) return [];

          return availableAddOn.entitlements.reduce(
            createActiveUsageBasedEntitlementsReducer(featureUsage, planPeriod),
            [],
          );
        },
      );

      // Also get entitlements from pre-selected add-ons in bypass mode
      const bypassAddOnEntitlements = (checkoutState?.addOnIds || []).flatMap(
        (addOnId) => {
          const availableAddOn = availableAddOns.find(
            (available) => available.id === addOnId,
          );

          if (!availableAddOn) return [];

          // Calculate usage-based entitlements (same logic as toggleAddOn)
          return availableAddOn.entitlements
            .filter((entitlement) => !!entitlement.priceBehavior)
            .map((entitlement) => ({
              ...entitlement,
              allocation: entitlement.valueNumeric || 0,
              usage: 0,
              quantity: 1,
            }));
        },
      );

      // Combine both sources, avoiding duplicates by featureId
      const allEntitlements = [...currentAddOnEntitlements];

      for (const bypassEnt of bypassAddOnEntitlements) {
        const exists = currentAddOnEntitlements.some(
          (current) => current.featureId === bypassEnt.featureId,
        );
        if (!exists) {
          allEntitlements.push(bypassEnt);
        }
      }

      return allEntitlements;
    });

  const payInAdvanceEntitlements = useMemo(
    () =>
      usageBasedEntitlements.filter(
        (entitlement) =>
          entitlement.priceBehavior === EntitlementPriceBehavior.PayInAdvance,
      ),
    [usageBasedEntitlements],
  );

  const addOnPayInAdvanceEntitlements = useMemo(
    () =>
      addOnUsageBasedEntitlements.filter(
        (entitlement) =>
          entitlement.priceBehavior === EntitlementPriceBehavior.PayInAdvance,
      ),
    [addOnUsageBasedEntitlements],
  );

  const [promoCode, setPromoCode] = useState<string | null>(null);

  const [isPaymentMethodRequired, setIsPaymentMethodRequired] = useState(false);

  const [willScheduleDowngrade, setWillScheduleDowngrade] = useState(false);

  const willTrialWithoutPaymentMethod = useMemo(
    () => shouldTrial && !trialPaymentMethodRequired,
    [shouldTrial, trialPaymentMethodRequired],
  );

  const isSelectedPlanTrialable =
    selectedPlan && selectedPlan.isTrialable && selectedPlan.companyCanTrial;

  const checkoutStages = useMemo(() => {
    const stages: CheckoutStage[] = [];

    if (availablePlans.length > 0) {
      stages.push({
        id: "plan",
        name: t("Plan"),
        label: t("Select plan"),
        description: t("Choose your base plan"),
      });
    }

    const hasSelfServiceAutoTopup = selectedPlan?.includedCreditGrants.some(
      (grant) => {
        const isSelfService = grant.billingCreditAutoTopupSelfService ?? false;
        return isSelfService;
      },
    );
    if (hasSelfServiceAutoTopup) {
      stages.push({
        id: "autoTopup",
        name: t("Auto Top-up"),
        label: t("Auto Top-up"),
      });
    }

    if (willTrialWithoutPaymentMethod) {
      return stages;
    }

    if (payInAdvanceEntitlements.length > 0) {
      stages.push({
        id: "usage",
        name: t("Quantity"),
      });
    }

    // addOns is already filtered by plan compatibility and currency support
    // in the addOns useMemo; skip the stage entirely when nothing remains.
    if (addOns.length > 0 && (!isSelectedPlanTrialable || !shouldTrial)) {
      stages.push({
        id: "addons",
        name: t("Add-ons"),
        label: t("Select add-ons"),
        description: t("Optionally add features to your subscription"),
      });
    }

    const hasUsageBasedAddOnSelected = addOns.some((addOn) => {
      return (
        addOn.isSelected &&
        addOn.entitlements.some((entitlement) => {
          return (
            entitlement.priceBehavior === EntitlementPriceBehavior.PayInAdvance
          );
        })
      );
    });

    if (hasUsageBasedAddOnSelected) {
      stages.push({
        id: "addonsUsage",
        name: t("Add-ons Quantity"),
        label: t("Select quantities for add-ons"),
        description: t("Quantity to pay for in advance"),
      });
    }

    if (creditBundles.length > 0) {
      stages.push({
        id: "credits",
        name: t("Credits"),
        label: t("Select credits"),
        description: t("Optionally add credit bundles to your subscription"),
      });
    }

    // A credit-only purchase needs a payment method too, but when the company
    // already has one on file we skip the dedicated payment stage so the user
    // can buy credits directly from the Credits stage.
    if (
      isPaymentMethodRequired &&
      !(isCreditOnlyPurchase && hasInitialPaymentMethod)
    ) {
      stages.push({
        id: "checkout",
        name: t("Checkout"),
        label: t("Checkout"),
      });
    }

    return stages;
  }, [
    t,
    availablePlans,
    selectedPlan?.includedCreditGrants,
    willTrialWithoutPaymentMethod,
    payInAdvanceEntitlements,
    addOns,
    isSelectedPlanTrialable,
    shouldTrial,
    creditBundles,
    isPaymentMethodRequired,
    isCreditOnlyPurchase,
    hasInitialPaymentMethod,
  ]);

  // Track if we're in the initial bypass loading phase
  const [isBypassLoading, setIsBypassLoading] = useState(
    () =>
      checkoutState?.bypassPlanSelection ||
      checkoutState?.bypassAddOnSelection ||
      checkoutState?.bypassCreditsSelection,
  );

  const [checkoutStage, setCheckoutStage] = useState(() => {
    if (checkoutState?.addOnId) {
      return "addons";
    }

    if (checkoutState?.addOnUsage) {
      return "addonsUsage";
    }

    if (checkoutState?.usage) {
      return "usage";
    }

    if (checkoutState?.credits) {
      return "credits";
    }

    return "plan";
  });

  // Walk past bypassed stages so the user lands on the first non-bypassed one.
  // The raw `checkoutStage` is preserved as the user's selection; navigating
  // back to a bypassed stage requires clearing the bypass flag first (see
  // the breadcrumb onSelect below).
  const effectiveCheckoutStage = useMemo(() => {
    if (isBypassLoading) return checkoutStage;

    let id = checkoutStage;
    while (
      (id === "plan" && checkoutState?.bypassPlanSelection) ||
      (id === "addons" && checkoutState?.bypassAddOnSelection) ||
      (id === "credits" && checkoutState?.bypassCreditsSelection)
    ) {
      const idx = checkoutStages.findIndex((s) => s.id === id);
      const next = checkoutStages[idx + 1];
      if (!next) break;
      id = next.id;
    }
    return id;
  }, [checkoutStage, checkoutStages, checkoutState, isBypassLoading]);

  const handlePreviewCheckout = useCallback(
    async (updates: {
      period?: string;
      plan?: SelectedPlan;
      shouldTrial?: boolean;
      autoTopupConfigs?: Map<string, AutoTopupConfig>;
      addOns?: SelectedPlan[];
      payInAdvanceEntitlements?: UsageBasedEntitlement[];
      addOnPayInAdvanceEntitlements?: UsageBasedEntitlement[];
      creditBundles?: CreditBundle[];
      promoCode?: string | null;
    }) => {
      const period = updates.period || planPeriod;
      const plan = updates.plan || selectedPlan;
      const resolvedCurrency = hasCurrency ? effectiveCurrency : undefined;
      const currencyPrice = plan
        ? getPlanPrice(
            plan,
            period,
            { useSelectedPeriod: true },
            resolvedCurrency,
          )
        : undefined;
      const planPriceId =
        currencyPrice?.id ??
        (period === "year"
          ? plan?.yearlyPrice?.id
          : period === "quarter"
            ? plan?.quarterlyPrice?.id
            : plan?.monthlyPrice?.id);
      const code =
        typeof updates.promoCode !== "undefined"
          ? updates.promoCode
          : promoCode;
      const skipTrial = !(updates.shouldTrial ?? shouldTrial);

      // A credit-bundle-only purchase on a non-billing subscription has no plan
      // or price to send; the backend charges for the credits standalone.
      const isCreditOnly =
        !data?.company?.billingSubscription &&
        !planPriceId &&
        (updates.creditBundles || creditBundles).some(
          (bundle) => bundle.count > 0,
        ) &&
        !(updates.addOns || addOns).some(
          (addOn) =>
            addOn.isSelected &&
            !!getAddOnPrice(addOn, period, resolvedCurrency)?.id,
        );

      // do not preview if user updates do not result in a valid plan,
      // unless this is a credit-only purchase that needs no plan
      if ((!plan || !planPriceId) && !isCreditOnly) {
        // ensure selected plan is reset if no valid price is found
        setSelectedPlanId(null);
        return;
      }

      setError(undefined);
      setCharges(undefined);
      setIsLoading(true);

      const resolvedAutoTopupConfigs =
        updates.autoTopupConfigs || autoTopupConfigs;
      const resolvedPayInAdvanceEntitlements =
        updates.payInAdvanceEntitlements || payInAdvanceEntitlements;
      const resolvedAddOnPayInAdvanceEntitlements =
        updates.addOnPayInAdvanceEntitlements || addOnPayInAdvanceEntitlements;
      const resolvedAddOns = updates.addOns || addOns;
      const resolvedCreditBundles = updates.creditBundles || creditBundles;
      const resolvedPlanCreditGrants = mergeCompanyGrants(
        plan?.includedCreditGrants,
        data?.company?.plan?.includedCreditGrants,
      );

      const autoTopupRequestBody = buildAutoTopupRequestBody({
        creditGrants: resolvedPlanCreditGrants,
        autoTopupConfigs: resolvedAutoTopupConfigs,
      });

      const planPayInAdvanceRequestBody = buildPayInAdvanceRequestBody({
        entitlements: resolvedPayInAdvanceEntitlements,
        period,
        currency: resolvedCurrency,
      });

      const addOnPayInAdvanceRequestBody = buildPayInAdvanceRequestBody({
        entitlements: resolvedAddOnPayInAdvanceEntitlements,
        period,
        currency: resolvedCurrency,
      });

      const addOnRequestBody = buildAddOnRequestBody({
        addOns: resolvedAddOns,
        period,
        shouldTrial,
        currency: resolvedCurrency,
      });

      const creditBundlesRequestBody = buildCreditBundlesRequestBody(
        resolvedCreditBundles,
      );

      try {
        const response = await previewCheckout({
          newPlanId: isCreditOnly ? "" : (plan?.id ?? ""),
          newPriceId: isCreditOnly ? "" : (planPriceId ?? ""),
          addOnIds: isCreditOnly ? [] : addOnRequestBody,
          autoTopupOverrides: isCreditOnly ? [] : autoTopupRequestBody,
          payInAdvance: isCreditOnly
            ? []
            : [...planPayInAdvanceRequestBody, ...addOnPayInAdvanceRequestBody],
          creditBundles: creditBundlesRequestBody,
          skipTrial,
          ...(code && { promoCode: code }),
        });

        if (response) {
          setCharges(response.data.finance);
          setIsPaymentMethodRequired(response.data.paymentMethodRequired);
          setWillScheduleDowngrade(response.data.isScheduledDowngrade);
        }

        if (typeof updates.promoCode !== "undefined") {
          setPromoCode(code);
        }
      } catch (err) {
        if (err instanceof ResponseError) {
          if (err.response.status === 401) {
            setError(t("Session expired. Please refresh and try again."));
            return;
          }

          const data = await err.response.json();

          if (err.response.status === 400) {
            switch (data.error) {
              case "Invalid promo code":
                setError(t("Invalid discount code."));
                return;
              case "ineligible for this discount":
                setError(t("Ineligible for this discount."));
                return;
              case "Quantity is required":
                setError(t("Quantity is required."));
                return;
              case "self-service downgrade not permitted":
                setError(t("Downgrade not permitted."));
                return;
            }
          }

          if (
            err.response.status === 409 &&
            isScheduledCheckoutConflictMessage(data?.error)
          ) {
            setError(t("Downgrade pending."));
            return;
          }

          setError(
            t("Error retrieving plan details. Please try again in a moment."),
          );
          return;
        }

        const { message: msg } = isError(err) ? err : ERROR_UNKNOWN;
        setError(msg);
      } finally {
        setIsLoading(false);
        // Turn off bypass loading after first API call completes
        if (isBypassLoading) {
          setIsBypassLoading(false);
        }
      }
    },
    [
      t,
      data?.company?.plan?.includedCreditGrants,
      data?.company?.billingSubscription,
      previewCheckout,
      planPeriod,
      selectedPlan,
      effectiveCurrency,
      hasCurrency,
      autoTopupConfigs,
      payInAdvanceEntitlements,
      addOnPayInAdvanceEntitlements,
      addOns,
      creditBundles,
      shouldTrial,
      promoCode,
      isBypassLoading,
    ],
  );

  const selectPlan = useCallback(
    (updates: {
      plan: SelectedPlan;
      period?: string;
      shouldTrial?: boolean;
    }) => {
      const plan = updates.plan;

      const period = showPeriodToggle
        ? updates.period || planPeriod
        : plan.monthlyPrice
          ? BillingProductPriceInterval.Month
          : plan.quarterlyPrice
            ? "quarter"
            : plan.yearlyPrice
              ? BillingProductPriceInterval.Year
              : BillingProductPriceInterval.Month;

      const updatedUsageBasedEntitlements = plan.entitlements.reduce(
        createActiveUsageBasedEntitlementsReducer(featureUsage, period),
        [],
      );

      if (period !== planPeriod || plan.id !== selectedPlan?.id) {
        setUsageBasedEntitlements((prev) => {
          return updatedUsageBasedEntitlements.map((updated) => {
            const current = prev.find(
              ({ featureId }) => featureId === updated.featureId,
            );

            if (typeof current?.quantity === "number") {
              return {
                ...updated,
                quantity: current.quantity,
              };
            }

            return updated;
          });
        });
      }

      if (period !== planPeriod) {
        setPlanPeriod(period);
      }

      // only update selected plan if the plan is changing
      if (plan.id !== selectedPlan?.id) {
        setSelectedPlanId(plan.id);
      }

      const updatedShouldTrial = updates.shouldTrial ?? shouldTrial;
      setShouldTrial(updatedShouldTrial);

      if (willTrialWithoutPaymentMethod) {
        setSelectedAddOnIds(new Set());
      }

      handlePreviewCheckout({
        period,
        plan,
        shouldTrial: updatedShouldTrial,
        ...(willTrialWithoutPaymentMethod
          ? {
              addOns: [],
              payInAdvanceEntitlements: [],
            }
          : {
              payInAdvanceEntitlements: updatedUsageBasedEntitlements.filter(
                ({ priceBehavior }) =>
                  priceBehavior === EntitlementPriceBehavior.PayInAdvance,
              ),
            }),
      });
    },
    [
      selectedPlan?.id,
      planPeriod,
      showPeriodToggle,
      featureUsage,
      shouldTrial,
      willTrialWithoutPaymentMethod,
      handlePreviewCheckout,
    ],
  );

  const changePlanPeriod = useCallback(
    (period: string) => {
      if (period === planPeriod) {
        return;
      }

      setPlanPeriod(period);

      const updatedUsageBasedEntitlements = (
        selectedPlan?.entitlements || []
      ).reduce(
        createActiveUsageBasedEntitlementsReducer(featureUsage, period),
        [...[]] as UsageBasedEntitlement[],
      );

      setUsageBasedEntitlements((prev) =>
        updatedUsageBasedEntitlements.map((updated) => {
          const current = prev.find(
            ({ featureId }) => featureId === updated.featureId,
          );
          if (typeof current?.quantity === "number") {
            return { ...updated, quantity: current.quantity };
          }
          return updated;
        }),
      );

      const updatedAddOnUsageBasedEntitlements = addOns
        .filter((addOn) => addOn.isSelected)
        .flatMap((addOn) =>
          addOn.entitlements.reduce(
            createActiveUsageBasedEntitlementsReducer(featureUsage, period),
            [] as UsageBasedEntitlement[],
          ),
        );

      setAddOnUsageBasedEntitlements((prev) =>
        updatedAddOnUsageBasedEntitlements.map((updated) => {
          const current = prev.find(
            ({ featureId }) => featureId === updated.featureId,
          );
          if (typeof current?.quantity === "number") {
            return { ...updated, quantity: current.quantity };
          }
          return updated;
        }),
      );

      handlePreviewCheckout({
        period,
        payInAdvanceEntitlements: updatedUsageBasedEntitlements.filter(
          ({ priceBehavior }) =>
            priceBehavior === EntitlementPriceBehavior.PayInAdvance,
        ),
        addOnPayInAdvanceEntitlements:
          updatedAddOnUsageBasedEntitlements.filter(
            ({ priceBehavior }) =>
              priceBehavior === EntitlementPriceBehavior.PayInAdvance,
          ),
      });
    },
    [
      planPeriod,
      selectedPlan?.entitlements,
      featureUsage,
      addOns,
      setPlanPeriod,
      handlePreviewCheckout,
    ],
  );

  const toggleAddOn = useCallback(
    (id: string) => {
      const updated = addOns.map((addOn) => ({
        ...addOn,
        ...(addOn.id === id && { isSelected: !addOn.isSelected }),
      }));

      const updatedAddOnEntitlements = updated
        .filter((addOn) => addOn.isSelected)
        .flatMap((addOn) => {
          return addOn.entitlements
            .filter((entitlement) => !!entitlement.priceBehavior)
            .map((source) => {
              const found = addOnUsageBasedEntitlements.find(
                (current) => current.id === source.id,
              );

              return {
                ...source,
                allocation: found?.allocation ?? source.valueNumeric ?? 0,
                usage: found?.usage ?? 0,
                quantity: found?.quantity ?? 1,
              };
            });
        });

      setAddOnUsageBasedEntitlements(updatedAddOnEntitlements);

      setSelectedAddOnIds(
        new Set(updated.filter((a) => a.isSelected).map((a) => a.id)),
      );

      const updatedAddOnPayInAdvanceEntitlements =
        updatedAddOnEntitlements.filter(
          (entitlement) =>
            entitlement.priceBehavior === EntitlementPriceBehavior.PayInAdvance,
        );
      handlePreviewCheckout({
        addOns: updated,
        addOnPayInAdvanceEntitlements: updatedAddOnPayInAdvanceEntitlements,
      });
    },
    [handlePreviewCheckout, addOnUsageBasedEntitlements, addOns],
  );

  const updateAutoTopupConfig = useCallback(
    (
      // plan credit grant id
      id: string,
      updates: Partial<AutoTopupConfig>,
    ) => {
      setAutoTopupConfigs((prev) => {
        const nextMap = new Map(prev);
        const prevConfig = prev.get(id);

        const matchedCreditGrant = planCreditGrants.find(
          (grant) => grant.id === id,
        );

        const updatedConfig: AutoTopupConfig = {
          companyAutoTopupEnabled:
            updates.companyAutoTopupEnabled ??
            prevConfig?.companyAutoTopupEnabled ??
            false,
          companyAutoTopupThresholdCredits:
            updates.companyAutoTopupThresholdCredits ??
            prevConfig?.companyAutoTopupThresholdCredits ??
            matchedCreditGrant?.billingCreditAutoTopupThresholdCredits ??
            0,
          companyAutoTopupAmount:
            updates.companyAutoTopupAmount ??
            prevConfig?.companyAutoTopupAmount ??
            matchedCreditGrant?.billingCreditAutoTopupAmount ??
            0,
        };

        nextMap.set(id, updatedConfig);

        handlePreviewCheckout({ autoTopupConfigs: nextMap });

        return nextMap;
      });
    },
    [handlePreviewCheckout, planCreditGrants],
  );

  const updateUsageBasedEntitlementQuantity = useCallback(
    (id: string, updatedQuantity: number) => {
      setUsageBasedEntitlements((prev) => {
        const updated = prev.map((entitlement) =>
          entitlement.id === id
            ? {
                ...entitlement,
                quantity: updatedQuantity,
              }
            : entitlement,
        );

        handlePreviewCheckout({
          payInAdvanceEntitlements: updated.filter(
            ({ priceBehavior }) =>
              priceBehavior === EntitlementPriceBehavior.PayInAdvance,
          ),
        });

        return updated;
      });
    },
    [handlePreviewCheckout],
  );

  const updateCreditBundleCount = useCallback(
    (id: string, updatedCount: number) => {
      setCreditBundles((prev) => {
        const updated = prev.map((bundle) =>
          bundle.id === id
            ? {
                ...bundle,
                count: updatedCount,
              }
            : bundle,
        );

        handlePreviewCheckout({ creditBundles: updated });

        return updated;
      });
    },
    [handlePreviewCheckout],
  );

  const updateAddOnEntitlementQuantity = useCallback(
    (id: string, updatedQuantity: number) => {
      setAddOnUsageBasedEntitlements((prev) => {
        const updated = prev.map((entitlement) =>
          entitlement.id === id
            ? {
                ...entitlement,
                quantity: updatedQuantity,
              }
            : entitlement,
        );

        const updatedAddOnPayInAdvanceEntitlements = updated.filter(
          (entitlement) =>
            entitlement.priceBehavior === EntitlementPriceBehavior.PayInAdvance,
        );
        handlePreviewCheckout({
          addOnPayInAdvanceEntitlements: updatedAddOnPayInAdvanceEntitlements,
        });

        return updated;
      });
    },
    [handlePreviewCheckout],
  );

  const updatePromoCode = useCallback(
    async (code: string | null) => {
      handlePreviewCheckout({ promoCode: code });
    },
    [handlePreviewCheckout],
  );

  const handleClose = useCallback(() => {
    clearCheckoutState();
    setLayout("portal");
  }, [setLayout, clearCheckoutState]);

  // this is needed to run the `selectPlan` logic on initial load
  // if the user is already on an available plan
  const hasInitializedPlan = useRef(false);

  useEffect(() => {
    if (!hasInitializedPlan.current && selectedPlan) {
      hasInitializedPlan.current = true;
      selectPlan({ plan: selectedPlan, period: planPeriod });
    }
  }, [selectedPlan, planPeriod, selectPlan]);

  useLayoutEffect(() => {
    const element = dialogRef.current;
    if (layout !== "checkout" || !element) {
      return;
    }

    const isParentBody = element.parentElement === document.body;
    setIsModal(isParentBody);

    if (element.open) {
      return;
    }

    if (isParentBody) {
      element.showModal();
    } else {
      element.show();
    }
  }, [layout]);

  useLayoutEffect(() => {
    stageRef.current?.scrollTo({
      top: 0,
      left: 0,
      behavior: "smooth",
    });
  }, [effectiveCheckoutStage]);

  useLayoutEffect(() => {
    if (charges) {
      sidebarRef.current?.scrollTo({
        top: 0,
        left: 0,
        behavior: "smooth",
      });
    }
  }, [charges]);

  const activeCheckoutStage = checkoutStages.find(
    (stage) => stage.id === effectiveCheckoutStage,
  );

  // Filter stages for breadcrumb display based on hideSkippedStages
  const visibleStages = useMemo(() => {
    if (!checkoutState?.hideSkippedStages) {
      return checkoutStages;
    }

    // Hide stages that were bypassed
    return checkoutStages.filter((stage) => {
      if (stage.id === "plan" && checkoutState.bypassPlanSelection) {
        return false;
      }
      if (stage.id === "addons" && checkoutState.bypassAddOnSelection) {
        return false;
      }
      if (stage.id === "credits" && checkoutState.bypassCreditsSelection) {
        return false;
      }
      return true;
    });
  }, [checkoutStages, checkoutState]);

  // Filter stages for navigation (always excludes bypassed stages)
  const navigableStages = useMemo(() => {
    return checkoutStages.filter((stage) => {
      if (stage.id === "plan" && checkoutState?.bypassPlanSelection) {
        return false;
      }
      if (stage.id === "addons" && checkoutState?.bypassAddOnSelection) {
        return false;
      }
      if (stage.id === "credits" && checkoutState?.bypassCreditsSelection) {
        return false;
      }
      return true;
    });
  }, [
    checkoutStages,
    checkoutState?.bypassPlanSelection,
    checkoutState?.bypassAddOnSelection,
    checkoutState?.bypassCreditsSelection,
  ]);

  // Show loading overlay while bypass mode resolves initial stage
  const shouldShowBypassOverlay = isBypassLoading;

  const canCheckout = data?.capabilities?.checkout ?? true;
  if (!canCheckout) {
    return null;
  }

  if (hasNoUsableCurrency) {
    return (
      <Dialog
        ref={setDialog}
        isModal={isModal}
        size="lg"
        top={top}
        onClose={handleClose}
        {...(!isModal && { open: layout === "checkout" })}
      >
        <DialogContent>
          <Flex
            $flexGrow={1}
            $alignItems="center"
            $justifyContent="center"
            $padding="2rem"
          >
            <InvalidCurrencyNotice invalidEntries={invalidFilterEntries} />
          </Flex>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog
      ref={setDialog}
      isModal={isModal}
      size="lg"
      top={top}
      onClose={handleClose}
      {...(!isModal && { open: layout === "checkout" })}
    >
      {shouldShowBypassOverlay && (
        <Overlay $justifyContent="center" $alignItems="center">
          <Loader $color={settings.theme.primary} $size="2xl" />
        </Overlay>
      )}

      <DialogHeader bordered onClose={handleClose}>
        <Flex
          $flexWrap="wrap"
          $gap="0.5rem"
          $viewport={{
            md: {
              $gap: "1rem",
            },
          }}
        >
          {visibleStages.map((stage, index, stages) => (
            <Navigation
              key={stage.id}
              name={stage.name}
              index={index}
              activeIndex={visibleStages.findIndex(
                (s) => s.id === effectiveCheckoutStage,
              )}
              isLast={index === stages.length - 1}
              onSelect={() => {
                // Clear bypass state when user manually navigates back to plan stage
                if (stage.id === "plan" && checkoutState?.bypassPlanSelection) {
                  setCheckoutState({
                    ...checkoutState,
                    planId: undefined,
                    bypassPlanSelection: false,
                  });
                }
                setCheckoutStage(stage.id);
              }}
            />
          ))}
        </Flex>
      </DialogHeader>

      <DialogContent ref={contentRef}>
        <Flex
          ref={stageRef}
          $flexDirection="column"
          $flexGrow={1}
          $gap="1.5rem"
          $padding="1.5rem"
          $backgroundColor={
            isLightBackground
              ? "hsla(0, 0%, 0%, 0.025)"
              : "hsla(0, 0%, 100%, 0.025)"
          }
          $overflow="auto"
          $viewport={{
            md: {
              $padding: "2rem 2.5rem 2rem 2.5rem",
            },
          }}
        >
          <Flex
            $flexDirection="column"
            $flexWrap="wrap"
            $gap="1.5rem"
            $viewport={{
              md: {
                $flexDirection: "row",
                $justifyContent: "space-between",
                $alignItems: "start",
                $gap: "1rem",
              },
            }}
          >
            {activeCheckoutStage && (
              <Flex $flexDirection="column" $gap="0.25rem">
                {activeCheckoutStage.label && (
                  <Text
                    as="h3"
                    display="heading3"
                    style={{ marginBottom: "0.5rem" }}
                  >
                    {activeCheckoutStage.label}
                  </Text>
                )}

                {activeCheckoutStage.description && (
                  <Text as="p">{activeCheckoutStage.description}</Text>
                )}
              </Flex>
            )}

            {effectiveCheckoutStage === "plan" && (
              <Flex $alignItems="center" $gap="0.75rem">
                {showCurrencySelector && (
                  <CurrencyToggle
                    currencies={currencies}
                    selectedCurrency={effectiveCurrency}
                    onSelect={setSelectedCurrency}
                  />
                )}

                {showPeriodToggle && availablePeriods.length > 1 && (
                  <PeriodToggle
                    portal={dialogElement}
                    options={availablePeriods}
                    selectedOption={planPeriod}
                    selectedPlan={selectedPlan}
                    onSelect={changePlanPeriod}
                  />
                )}
              </Flex>
            )}
          </Flex>

          {isPending ? (
            <Flex
              $width="100%"
              $height="100%"
              $alignItems="center"
              $justifyContent="center"
              $padding={`${settings.theme.card.padding / TEXT_BASE_SIZE}rem`}
            >
              <Loader $size="2xl" />
            </Flex>
          ) : effectiveCheckoutStage === "plan" ? (
            <Plan
              portal={dialogElement}
              isLoading={isLoading}
              period={planPeriod}
              plans={availablePlans}
              selectedPlan={selectedPlan}
              selectPlan={selectPlan}
              shouldTrial={shouldTrial}
              currency={hasCurrency ? effectiveCurrency : undefined}
            />
          ) : effectiveCheckoutStage === "autoTopup" ? (
            <AutoTopup
              isLoading={isLoading}
              planCreditGrants={planCreditGrants}
              autoTopupConfigs={autoTopupConfigs}
              updateAutoTopupConfig={updateAutoTopupConfig}
              currency={hasCurrency ? selectedCurrency : undefined}
            />
          ) : effectiveCheckoutStage === "usage" ? (
            <Quantity
              portal={dialogElement}
              isLoading={isLoading}
              period={planPeriod}
              selectedPlan={selectedPlan}
              entitlements={payInAdvanceEntitlements}
              updateQuantity={updateUsageBasedEntitlementQuantity}
              currency={hasCurrency ? effectiveCurrency : undefined}
            />
          ) : effectiveCheckoutStage === "addons" ? (
            <AddOns
              isLoading={isLoading}
              period={planPeriod}
              addOns={addOns}
              toggle={(id) => toggleAddOn(id)}
              currency={hasCurrency ? effectiveCurrency : undefined}
            />
          ) : effectiveCheckoutStage === "addonsUsage" ? (
            <Quantity
              portal={dialogElement}
              isLoading={isLoading}
              period={planPeriod}
              selectedPlan={selectedPlan}
              entitlements={addOnPayInAdvanceEntitlements}
              updateQuantity={updateAddOnEntitlementQuantity}
              currency={hasCurrency ? effectiveCurrency : undefined}
            />
          ) : effectiveCheckoutStage === "credits" ? (
            <Credits
              isLoading={isLoading}
              bundles={creditBundles}
              updateCount={updateCreditBundleCount}
              currency={hasCurrency ? effectiveCurrency : undefined}
            />
          ) : (
            effectiveCheckoutStage === "checkout" && (
              <Checkout
                isPaymentMethodRequired={isPaymentMethodRequired}
                setPaymentMethodId={(id) => setPaymentMethodId(id)}
                updatePromoCode={updatePromoCode}
                confirmPaymentIntentProps={confirmPaymentIntentProps}
                financeData={charges}
                onPaymentMethodSaved={handlePreviewCheckout}
              />
            )
          )}
        </Flex>

        <SubscriptionSidebar
          ref={sidebarRef}
          portal={dialogElement}
          planPeriod={planPeriod}
          selectedPlan={selectedPlan}
          autoTopupConfigs={autoTopupConfigs}
          addOns={addOns}
          usageBasedEntitlements={usageBasedEntitlements}
          addOnUsageBasedEntitlements={addOnUsageBasedEntitlements}
          addOnPayInAdvanceEntitlements={addOnPayInAdvanceEntitlements}
          creditBundles={creditBundles}
          isCreditOnlyPurchase={isCreditOnlyPurchase}
          charges={charges}
          checkoutStage={effectiveCheckoutStage}
          checkoutStages={navigableStages}
          error={error}
          isLoading={isLoading}
          isPaymentMethodRequired={isPaymentMethodRequired}
          paymentMethodId={paymentMethodId}
          promoCode={promoCode}
          setCheckoutStage={(stage) => setCheckoutStage(stage)}
          setError={(msg) => setError(msg)}
          setIsLoading={setIsLoading}
          updatePromoCode={updatePromoCode}
          shouldTrial={shouldTrial}
          setConfirmPaymentIntent={setConfirmPaymentIntentProps}
          willTrialWithoutPaymentMethod={willTrialWithoutPaymentMethod}
          willScheduleDowngrade={willScheduleDowngrade}
          currency={hasCurrency ? effectiveCurrency : undefined}
        />
      </DialogContent>
    </Dialog>
  );
};
