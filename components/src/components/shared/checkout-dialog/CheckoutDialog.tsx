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
  EntitlementPriceBehavior,
  ResponseError,
  type CompanyPlanDetailResponseData,
  type FeatureUsageResponseData,
  type PlanEntitlementResponseData,
  type PreviewSubscriptionFinanceResponseData,
} from "../../../api/checkoutexternal";
import { TEXT_BASE_SIZE } from "../../../const";
import {
  useAvailablePlans,
  useEmbed,
  useIsLightBackground,
} from "../../../hooks";
import type {
  CreditBundle,
  SelectedPlan,
  UsageBasedEntitlement,
} from "../../../types";
import {
  ERROR_UNKNOWN,
  buildAddOnRequestBody,
  buildCreditBundlesRequestBody,
  buildPayInAdvanceRequestBody,
  getSelectedAddOns,
  getSelectedPlan,
  isAddOnSelected,
  isError,
} from "../../../utils";
import { PeriodToggle, SubscriptionSidebar } from "../../shared";
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

import { AddOns, Checkout, Credits, Plan, Quantity } from ".";

export const createActiveUsageBasedEntitlementsReducer =
  (entitlements: FeatureUsageResponseData[], period: string) =>
  (acc: UsageBasedEntitlement[], entitlement: PlanEntitlementResponseData) => {
    if (
      entitlement.priceBehavior &&
      ((period === "month" && entitlement.meteredMonthlyPrice) ||
        (period === "year" && entitlement.meteredYearlyPrice))
    ) {
      const featureUsage = entitlements.find(
        (usage) => usage.feature?.id === entitlement.feature?.id,
      );
      const allocation =
        featureUsage?.allocation ?? entitlement.valueNumeric ?? 0;
      const usage = featureUsage?.usage ?? 0;
      const quantity =
        featureUsage?.priceBehavior === EntitlementPriceBehavior.PayInAdvance
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
  } = useEmbed();

  const isLightBackground = useIsLightBackground();

  const dialogRef = useRef<HTMLDialogElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  // this is needed to run the `selectPlan` logic on initial load
  // if the user is already on an available plan
  const hasInitializedPlan = useRef(false);

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

  const { featureUsage, showPeriodToggle, trialPaymentMethodRequired } =
    useMemo(() => {
      return {
        featureUsage: data?.featureUsage ? data.featureUsage.features : [],
        showPeriodToggle: data?.displaySettings?.showPeriodToggle ?? true,
        trialPaymentMethodRequired: data?.trialPaymentMethodRequired === true,
      };
    }, [
      data?.featureUsage,
      data?.displaySettings?.showPeriodToggle,
      data?.trialPaymentMethodRequired,
    ]);

  // Validates the requested period against the plan's availability.
  // Note: Plan data must be loaded by the time CheckoutDialog mounts.
  const getValidatedPeriod = () => {
    const requestedPeriod =
      checkoutState?.period || data?.company?.plan?.planPeriod || "month";

    // If a specific plan is requested, validate the period against that plan's availability
    if (checkoutState?.planId) {
      const requestedPlan = data?.activePlans?.find(
        (plan) => plan.id === checkoutState.planId,
      );

      if (requestedPlan) {
        const planSupportsRequestedPeriod =
          (requestedPeriod === "month" && requestedPlan.monthlyPrice) ||
          (requestedPeriod === "year" && requestedPlan.yearlyPrice);

        if (!planSupportsRequestedPeriod) {
          // Fall back to the period the plan does support
          if (requestedPlan.yearlyPrice) return "year";
          if (requestedPlan.monthlyPrice) return "month";
        }
      }
    }

    return requestedPeriod;
  };

  const [planPeriod, setPlanPeriod] = useState(getValidatedPeriod);

  const {
    plans: availablePlans,
    addOns: availableAddOns,
    periods: availablePeriods,
  } = useAvailablePlans(planPeriod, {
    useSelectedPeriod: showPeriodToggle,
  });

  const [selectedPlanId, setSelectedPlanId] = useState<string | undefined>(
    () => {
      const planId = checkoutState?.planId ?? undefined;
      const selected = getSelectedPlan(availablePlans, planId);
      return selected?.id;
    },
  );
  const selectedPlan = useMemo<
    CompanyPlanDetailResponseData | undefined
  >(() => {
    const planId = selectedPlanId || checkoutState?.planId || undefined;
    return getSelectedPlan(availablePlans, planId);
  }, [checkoutState?.planId, availablePlans, selectedPlanId]);

  const [shouldTrial, setShouldTrial] = useState(false);

  const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>(() => {
    let addOnIds: string[];
    if (checkoutState?.addOnIds) {
      addOnIds = [...checkoutState.addOnIds];
    } else if (checkoutState?.addOnId) {
      addOnIds = [checkoutState.addOnId];
    } else {
      addOnIds = [];
    }

    const selected = getSelectedAddOns(availableAddOns, addOnIds);

    return selected.map((addOn) => addOn.id);
  });
  const addOns = useMemo<SelectedPlan[]>(() => {
    let addOnIds: string[];
    if (selectedAddOnIds.length > 0) {
      addOnIds = selectedAddOnIds;
    } else if (checkoutState?.addOnIds) {
      addOnIds = [...checkoutState.addOnIds];
    } else if (checkoutState?.addOnId) {
      addOnIds = [checkoutState.addOnId];
    } else {
      addOnIds = [];
    }

    const filtered = availableAddOns.reduce<SelectedPlan[]>((acc, addOn) => {
      const isSelected = isAddOnSelected(addOn, addOnIds);
      const addOnWithIsSelected = { ...addOn, isSelected };

      if (!selectedPlanId) {
        acc.push(addOnWithIsSelected);
        return acc;
      }

      const ourCompats = data?.addOnCompatibilities.find(
        (compat) => compat.sourcePlanId === addOn.id,
      );
      if (
        !ourCompats ||
        !ourCompats.compatiblePlanIds.length ||
        ourCompats.compatiblePlanIds.includes(selectedPlanId)
      ) {
        acc.push(addOnWithIsSelected);
        return acc;
      }

      return acc;
    }, []);

    return filtered;
  }, [
    data?.addOnCompatibilities,
    checkoutState?.addOnId,
    checkoutState?.addOnIds,
    availableAddOns,
    selectedPlanId,
    selectedAddOnIds,
  ]);

  const [creditBundleQuantities, setCreditBundleQuantities] = useState<{
    [id: string]: number;
  }>({});
  const creditBundles = useMemo<CreditBundle[]>(() => {
    return (data?.creditBundles || []).map((bundle) => ({
      ...bundle,
      quantity: creditBundleQuantities[bundle.id],
    }));
  }, [data?.creditBundles, creditBundleQuantities]);

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

          // Calculate pay-in-advance entitlements (same logic as toggleAddOn)
          return availableAddOn.entitlements
            .filter(
              (entitlement) =>
                entitlement.priceBehavior ===
                EntitlementPriceBehavior.PayInAdvance,
            )
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

    if (willTrialWithoutPaymentMethod) {
      return stages;
    }

    if (payInAdvanceEntitlements.length > 0) {
      stages.push({
        id: "usage",
        name: t("Quantity"),
      });
    }

    // addOns could be filtered by compatibility rules
    if (addOns.length > 0 && (!isSelectedPlanTrialable || !shouldTrial)) {
      stages.push({
        id: "addons",
        name: t("Add-ons"),
        label: t("Select add-ons"),
        description: t("Optionally add features to your subscription"),
      });
    }

    const hasPayInAdvanceAddOnSelected = addOns.some((addOn) => {
      return (
        addOn.isSelected &&
        addOn.entitlements.some((entitlement) => {
          return (
            entitlement.priceBehavior === EntitlementPriceBehavior.PayInAdvance
          );
        })
      );
    });

    if (hasPayInAdvanceAddOnSelected) {
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

    if (isPaymentMethodRequired) {
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
    willTrialWithoutPaymentMethod,
    payInAdvanceEntitlements,
    addOns,
    isSelectedPlanTrialable,
    shouldTrial,
    creditBundles,
    isPaymentMethodRequired,
  ]);

  // Track if we've already performed the initial skip in bypass mode
  const [hasSkippedInitialPlan, setHasSkippedInitialPlan] = useState(false);
  const [hasSkippedInitialAddOns, setHasSkippedInitialAddOns] = useState(false);
  const [hasSkippedInitialCredits, setHasSkippedInitialCredits] =
    useState(false);

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

    // Always start at "plan" stage - let useEffect handle bypass skipping
    // after stages are fully loaded. This prevents skipping past stages
    // (like credits) that haven't been populated yet from async data.
    return "plan";
  });

  // Skip past bypassed stages when using bypass mode (initializeWithPlan)
  useEffect(() => {
    // Wait for bypass loading to complete before skipping stages.
    // This ensures we have the complete stage list (credits, etc.) loaded
    // from async data before deciding which stages to skip.
    if (isBypassLoading) {
      return;
    }

    // Skip plan stage if bypassing plan selection
    if (
      checkoutState?.bypassPlanSelection &&
      checkoutStage === "plan" &&
      !hasSkippedInitialPlan
    ) {
      const currentIndex = checkoutStages.findIndex((s) => s.id === "plan");
      const nextStage = checkoutStages[currentIndex + 1];
      if (nextStage) {
        setHasSkippedInitialPlan(true);
        setCheckoutStage(nextStage.id);
      }
    }

    // Skip add-ons stage if bypassing add-on selection
    if (
      checkoutState?.bypassAddOnSelection &&
      checkoutStage === "addons" &&
      !hasSkippedInitialAddOns
    ) {
      const currentIndex = checkoutStages.findIndex((s) => s.id === "addons");
      const nextStage = checkoutStages[currentIndex + 1];
      if (nextStage) {
        setHasSkippedInitialAddOns(true);
        setCheckoutStage(nextStage.id);
      }
    }

    // Skip credits stage if bypassing credits selection
    if (
      checkoutState?.bypassCreditsSelection &&
      checkoutStage === "credits" &&
      !hasSkippedInitialCredits
    ) {
      const currentIndex = checkoutStages.findIndex((s) => s.id === "credits");
      const nextStage = checkoutStages[currentIndex + 1];
      if (nextStage) {
        setHasSkippedInitialCredits(true);
        setCheckoutStage(nextStage.id);
      }
    }
  }, [
    checkoutStages,
    checkoutState?.bypassPlanSelection,
    checkoutState?.bypassAddOnSelection,
    checkoutState?.bypassCreditsSelection,
    checkoutStage,
    hasSkippedInitialPlan,
    hasSkippedInitialAddOns,
    hasSkippedInitialCredits,
    isBypassLoading,
  ]);

  const handlePreviewCheckout = useCallback(
    async (updates: {
      period?: string;
      plan?: CompanyPlanDetailResponseData;
      shouldTrial?: boolean;
      addOns?: CompanyPlanDetailResponseData[];
      payInAdvanceEntitlements?: UsageBasedEntitlement[];
      addOnPayInAdvanceEntitlements?: UsageBasedEntitlement[];
      creditBundles?: CreditBundle[];
      promoCode?: string | null;
    }) => {
      const period = updates.period || planPeriod;
      const plan = updates.plan || selectedPlan;
      const planPriceId =
        period === "year" ? plan?.yearlyPrice?.id : plan?.monthlyPrice?.id;
      const code =
        typeof updates.promoCode !== "undefined"
          ? updates.promoCode
          : promoCode;
      const skipTrial = !(updates.shouldTrial ?? shouldTrial);

      // do not preview if user updates do not result in a valid plan
      if (!plan || !planPriceId) {
        // ensure selected plan is reset if no valid price is found
        setSelectedPlanId(undefined);
        return;
      }

      setError(undefined);
      setCharges(undefined);
      setIsLoading(true);

      const resolvedPayInAdvanceEntitlements =
        updates.payInAdvanceEntitlements || payInAdvanceEntitlements;
      const resolvedAddOnPayInAdvanceEntitlements =
        updates.addOnPayInAdvanceEntitlements || addOnPayInAdvanceEntitlements;
      const resolvedAddOns = updates.addOns || addOns;
      const resolvedCreditBundles = updates.creditBundles || creditBundles;

      const planPayInAdvanceRequestBody = buildPayInAdvanceRequestBody(
        resolvedPayInAdvanceEntitlements,
        period,
      );

      const addOnPayInAdvanceRequestBody = buildPayInAdvanceRequestBody(
        resolvedAddOnPayInAdvanceEntitlements,
        period,
      );

      const addOnRequestBody = buildAddOnRequestBody(
        resolvedAddOns,
        period,
        shouldTrial,
        resolvedAddOnPayInAdvanceEntitlements,
      );

      const creditBundlesRequestBody = buildCreditBundlesRequestBody(
        resolvedCreditBundles,
      );

      try {
        const response = await previewCheckout({
          newPlanId: plan.id,
          newPriceId: planPriceId,
          addOnIds: addOnRequestBody,
          payInAdvance: [
            ...planPayInAdvanceRequestBody,
            ...addOnPayInAdvanceRequestBody,
          ],
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
          const data = await err.response.json();

          if (
            err.response.status === 401 &&
            data.error === "Access Token Invalid"
          ) {
            setError(t("Session expired. Please refresh and try again."));
            return;
          }

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

          if (err.response.status === 409) {
            switch (data.error) {
              case "cannot purchase pay-in-advance entitlements while a scheduled downgrade is pending; cancel the scheduled downgrade first":
                setError(t("Downgrade pending."));
                return;
            }
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
      previewCheckout,
      planPeriod,
      selectedPlan,
      payInAdvanceEntitlements,
      addOnPayInAdvanceEntitlements,
      addOns,
      creditBundleQuantities,
      shouldTrial,
      promoCode,
      isBypassLoading,
    ],
  );

  const selectPlan = useCallback(
    (updates: {
      plan: CompanyPlanDetailResponseData;
      period?: string;
      shouldTrial?: boolean;
    }) => {
      const plan = updates.plan;

      const period = showPeriodToggle
        ? updates.period || planPeriod
        : plan.yearlyPrice && !plan.monthlyPrice
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
        setSelectedAddOnIds([]);
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
      if (period !== planPeriod) {
        setPlanPeriod(period);
        handlePreviewCheckout({ period });
      }
    },
    [planPeriod, setPlanPeriod, handlePreviewCheckout],
  );

  const toggleAddOn = useCallback((id: string) => {
    setSelectedAddOnIds((prev) => {
      const idx = prev.indexOf(id);
      return idx > -1
        ? [...prev.slice(0, idx), ...prev.slice(idx + 1)]
        : [...prev, id];

      /* const updatedAddOnEntitlements = updated
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

        const updatedAddOnPayInAdvanceEntitlements =
          updatedAddOnEntitlements.filter(
            (entitlement) =>
              entitlement.priceBehavior ===
              EntitlementPriceBehavior.PayInAdvance,
          );
        handlePreviewCheckout({
          addOns: updated,
          addOnPayInAdvanceEntitlements: updatedAddOnPayInAdvanceEntitlements,
        }); */
    });
  }, []);

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
    (id: string, updatedQuantity: number) => {
      setCreditBundleQuantities((prev) => {
        const currentQuantity = prev[id];
        if (currentQuantity === updatedQuantity) {
          return prev;
        }

        const updated = { ...prev };
        updated.id = updatedQuantity;

        handlePreviewCheckout({ creditBundles });

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

  // TODO: maybe remove
  /* useEffect(() => {
    if (!hasInitializedPlan.current && selectedPlan) {
      hasInitializedPlan.current = true;
      selectPlan({ plan: selectedPlan, period: planPeriod });
    }
  }, [selectedPlan, planPeriod, selectPlan]); */

  useEffect(() => {
    if (checkoutState?.planId) {
      const plan = availablePlans.find(
        (plan) => plan.id === checkoutState.planId,
      );

      // Only call selectPlan if the plan actually changed to avoid redundant API calls
      if (plan && plan.id !== selectedPlan?.id) {
        selectPlan({ plan, period: planPeriod });
      }
    }
  }, [
    availablePlans,
    checkoutState?.planId,
    planPeriod,
    selectPlan,
    selectedPlan?.id,
  ]);

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
  }, [checkoutStage]);

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
    (stage) => stage.id === checkoutStage,
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
  const shouldShowBypassOverlay =
    isBypassLoading ||
    (checkoutState?.bypassPlanSelection &&
      checkoutStage === "plan" &&
      !hasSkippedInitialPlan) ||
    (checkoutState?.bypassAddOnSelection &&
      checkoutStage === "addons" &&
      !hasSkippedInitialAddOns) ||
    (checkoutState?.bypassCreditsSelection &&
      checkoutStage === "credits" &&
      !hasSkippedInitialCredits);

  const canCheckout = data?.capabilities?.checkout ?? true;
  if (!canCheckout) {
    return null;
  }

  return (
    <Dialog
      ref={dialogRef}
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
                (s) => s.id === checkoutStage,
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

            {checkoutStage === "plan" &&
              showPeriodToggle &&
              availablePeriods.length > 1 && (
                <PeriodToggle
                  options={availablePeriods}
                  selectedOption={planPeriod}
                  selectedPlan={selectedPlan}
                  onSelect={changePlanPeriod}
                  tooltipPortal={dialogRef.current}
                />
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
          ) : checkoutStage === "plan" ? (
            <Plan
              isLoading={isLoading}
              period={planPeriod}
              plans={availablePlans}
              selectedPlan={selectedPlan}
              selectPlan={selectPlan}
              shouldTrial={shouldTrial}
              tooltipPortal={dialogRef.current}
            />
          ) : checkoutStage === "usage" ? (
            <Quantity
              isLoading={isLoading}
              period={planPeriod}
              selectedPlan={selectedPlan}
              entitlements={payInAdvanceEntitlements}
              updateQuantity={updateUsageBasedEntitlementQuantity}
              tooltipPortal={dialogRef.current}
            />
          ) : checkoutStage === "addons" ? (
            <AddOns
              isLoading={isLoading}
              period={planPeriod}
              addOns={addOns}
              toggle={(id) => toggleAddOn(id)}
            />
          ) : checkoutStage === "addonsUsage" ? (
            <Quantity
              isLoading={isLoading}
              period={planPeriod}
              selectedPlan={selectedPlan}
              entitlements={addOnPayInAdvanceEntitlements}
              updateQuantity={updateAddOnEntitlementQuantity}
              tooltipPortal={dialogRef.current}
            />
          ) : checkoutStage === "credits" ? (
            <Credits
              isLoading={isLoading}
              bundles={creditBundles}
              updateCount={updateCreditBundleCount}
            />
          ) : (
            checkoutStage === "checkout" && (
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
          portalRef={dialogRef}
          planPeriod={planPeriod}
          selectedPlan={selectedPlan}
          addOns={addOns}
          usageBasedEntitlements={usageBasedEntitlements}
          addOnUsageBasedEntitlements={addOnUsageBasedEntitlements}
          addOnPayInAdvanceEntitlements={addOnPayInAdvanceEntitlements}
          creditBundles={creditBundles}
          charges={charges}
          checkoutStage={checkoutStage}
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
        />
      </DialogContent>
    </Dialog>
  );
};
