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
  ResponseError,
  UpdateCreditBundleRequestBody,
  type FeatureUsageResponseData,
  type PlanEntitlementResponseData,
  type PreviewSubscriptionFinanceResponseData,
  type UpdateAddOnRequestBody,
  type UpdatePayInAdvanceRequestBody,
} from "../../../api/checkoutexternal";
import { PriceBehavior, PriceInterval, TEXT_BASE_SIZE } from "../../../const";
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
import { ERROR_UNKNOWN, getAddOnPrice, isError } from "../../../utils";
import { PeriodToggle } from "../../shared";
import { Flex, Loader, Modal, ModalContent, ModalHeader, Text } from "../../ui";
import { Sidebar } from "../sidebar";

import { AddOns } from "./AddOns";
import { Checkout } from "./Checkout";
import { Credits } from "./Credits";
import { Navigation } from "./Navigation";
import { Plan } from "./Plan";
import { Usage } from "./Usage";

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

      acc.push({
        ...entitlement,
        allocation,
        usage,
        quantity: allocation,
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

export const CheckoutDialog = ({ top = 0 }: CheckoutDialogProps) => {
  const { t } = useTranslation();

  const { data, settings, isPending, checkoutState, previewCheckout } =
    useEmbed();

  const isLightBackground = useIsLightBackground();

  const modalRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

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

  const { currentEntitlements, showPeriodToggle, trialPaymentMethodRequired } =
    useMemo(() => {
      return {
        currentEntitlements: data?.featureUsage
          ? data.featureUsage.features
          : [],
        showPeriodToggle: data?.showPeriodToggle ?? true,
        trialPaymentMethodRequired: data?.trialPaymentMethodRequired === true,
      };
    }, [
      data?.featureUsage,
      data?.showPeriodToggle,
      data?.trialPaymentMethodRequired,
    ]);

  const currentPeriod = useMemo(
    () => checkoutState?.period || data?.company?.plan?.planPeriod || "month",
    [data?.company?.plan?.planPeriod, checkoutState?.period],
  );

  const [planPeriod, setPlanPeriod] = useState(currentPeriod);

  const {
    plans: availablePlans,
    addOns: availableAddOns,
    periods: availablePeriods,
  } = useAvailablePlans(planPeriod, {
    useSelectedPeriod: showPeriodToggle,
  });

  const [selectedPlan, setSelectedPlan] = useState<SelectedPlan | undefined>(
    () => {
      return availablePlans.find((plan) =>
        checkoutState?.planId ? plan.id === checkoutState.planId : plan.current,
      );
    },
  );

  const [shouldTrial, setShouldTrial] = useState(false);

  const [addOns, setAddOns] = useState(() => {
    return availableAddOns.map((addOn) => ({
      ...addOn,
      isSelected:
        // Check if bypassed with specific add-on IDs
        checkoutState?.addOnIds?.includes(addOn.id) ||
        // Check if single add-on ID provided
        (typeof checkoutState?.addOnId !== "undefined"
          ? addOn.id === checkoutState.addOnId
          : (data?.company?.addOns || []).some(
              (currentAddOn) => addOn.id === currentAddOn.id,
            )),
    }));
  });

  const [creditBundles, setCreditBundles] = useState<CreditBundle[]>(() => {
    return (data?.creditBundles || []).map((bundle) => ({
      ...bundle,
      count: 0,
    }));
  });

  const [usageBasedEntitlements, setUsageBasedEntitlements] = useState(() =>
    (selectedPlan?.entitlements || []).reduce(
      createActiveUsageBasedEntitlementsReducer(
        currentEntitlements,
        planPeriod,
      ),
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
            createActiveUsageBasedEntitlementsReducer(
              currentEntitlements,
              planPeriod,
            ),
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
                entitlement.priceBehavior === PriceBehavior.PayInAdvance,
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
          entitlement.priceBehavior === PriceBehavior.PayInAdvance,
      ),
    [usageBasedEntitlements],
  );

  const addOnPayInAdvanceEntitlements = useMemo(
    () =>
      addOnUsageBasedEntitlements.filter(
        (entitlement) =>
          entitlement.priceBehavior === PriceBehavior.PayInAdvance,
      ),
    [addOnUsageBasedEntitlements],
  );

  const [promoCode, setPromoCode] = useState<string | null>(null);

  const [isPaymentMethodRequired, setIsPaymentMethodRequired] = useState(false);

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

    const hasUsageBasedAddOnSelected = addOns.some((addOn) => {
      return (
        addOn.isSelected &&
        addOn.entitlements.some((entitlement) => {
          return entitlement.priceBehavior === PriceBehavior.PayInAdvance;
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
  const [hasSkippedInitialCredits, setHasSkippedInitialCredits] = useState(false);

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

    // Skip plan stage only when explicitly configured via bypassPlanSelection
    // Pre-selecting a plan (via planId) without bypass shows the plan stage
    if (checkoutState?.bypassPlanSelection) {
      return checkoutStages.some((stage) => stage.id === "usage")
        ? "usage"
        : checkoutStages.some((stage) => stage.id === "addons")
          ? "addons"
          : checkoutStages.some((stage) => stage.id === "addonsUsage")
            ? "addonsUsage"
            : checkoutStages.some((stage) => stage.id === "credits")
              ? "credits"
              : checkoutStages.some((stage) => stage.id === "checkout")
                ? "checkout"
                : checkoutStages[0]?.id || "plan";
    }

    return "plan";
  });

  // Skip past bypassed stages when using bypass mode (initializeWithPlan)
  useEffect(() => {
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
  ]);

  const handlePreviewCheckout = useCallback(
    async (updates: {
      period?: string;
      plan?: SelectedPlan;
      shouldTrial?: boolean;
      addOns?: SelectedPlan[];
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
        setSelectedPlan(undefined);
        return;
      }

      setError(undefined);
      setCharges(undefined);
      setIsLoading(true);

      try {
        const response = await previewCheckout({
          newPlanId: plan.id,
          newPriceId: planPriceId,
          addOnIds: (updates.addOns || addOns).reduce(
            (acc: UpdateAddOnRequestBody[], addOn) => {
              if (addOn.isSelected) {
                const addOnPriceId = getAddOnPrice(addOn, period)?.id;

                if (addOnPriceId) {
                  acc.push({
                    addOnId: addOn.id,
                    priceId: addOnPriceId,
                  });
                }
              }

              return acc;
            },
            [],
          ),
          payInAdvance: [
            ...(
              updates.payInAdvanceEntitlements || payInAdvanceEntitlements
            ).reduce(
              (
                acc: UpdatePayInAdvanceRequestBody[],
                { meteredMonthlyPrice, meteredYearlyPrice, quantity },
              ) => {
                const priceId = (
                  period === "year" ? meteredYearlyPrice : meteredMonthlyPrice
                )?.priceId;

                if (priceId) {
                  acc.push({
                    priceId,
                    quantity,
                  });
                }

                return acc;
              },
              [],
            ),
            ...(
              updates.addOnPayInAdvanceEntitlements ||
              addOnUsageBasedEntitlements
            ).reduce(
              (
                acc: UpdatePayInAdvanceRequestBody[],
                { meteredMonthlyPrice, meteredYearlyPrice, quantity },
              ) => {
                const priceId = (
                  period === "year" ? meteredYearlyPrice : meteredMonthlyPrice
                )?.priceId;

                if (priceId) {
                  acc.push({
                    priceId,
                    quantity,
                  });
                }

                return acc;
              },
              [],
            ),
          ],
          creditBundles: (updates.creditBundles || creditBundles).reduce(
            (acc: UpdateCreditBundleRequestBody[], { id, count }) => {
              if (count > 0) {
                acc.push({
                  bundleId: id,
                  quantity: count,
                });
              }

              return acc;
            },
            [],
          ),
          skipTrial,
          ...(code && { promoCode: code }),
        });

        if (response) {
          setCharges(response.data.finance);
          setIsPaymentMethodRequired(response.data.paymentMethodRequired);
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
              case "Quantity is required":
                setError(t("Quantity is required."));
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
      addOnUsageBasedEntitlements,
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
        : plan.yearlyPrice && !plan.monthlyPrice
          ? PriceInterval.Year
          : PriceInterval.Month;

      const updatedUsageBasedEntitlements = plan.entitlements.reduce(
        createActiveUsageBasedEntitlementsReducer(currentEntitlements, period),
        [],
      );

      if (period !== planPeriod || plan.id !== selectedPlan?.id) {
        setUsageBasedEntitlements(updatedUsageBasedEntitlements);
      }

      if (period !== planPeriod) {
        setPlanPeriod(period);
      }

      // only update selected plan if the plan is changing
      if (plan.id !== selectedPlan?.id) {
        setSelectedPlan(plan);
      }

      const updatedShouldTrial = updates.shouldTrial ?? shouldTrial;
      setShouldTrial(updatedShouldTrial);

      if (willTrialWithoutPaymentMethod) {
        setAddOns((prev) =>
          prev.map((addOn) => ({
            ...addOn,
            isSelected: false,
          })),
        );
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
                  priceBehavior === PriceBehavior.PayInAdvance,
              ),
            }),
      });
    },
    [
      selectedPlan?.id,
      planPeriod,
      showPeriodToggle,
      currentEntitlements,
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

  const toggleAddOn = useCallback(
    (id: string) => {
      setAddOns((prev) => {
        const updated = prev.map((addOn) => ({
          ...addOn,
          ...(addOn.id === id && { isSelected: !addOn.isSelected }),
        }));

        const updatedAddOnEntitlements = updated
          .filter((addOn) => addOn.isSelected)
          .flatMap((addOn) =>
            addOn.entitlements
              .filter(
                (entitlement) =>
                  entitlement.priceBehavior === PriceBehavior.PayInAdvance,
              )
              .map((entitlement) => ({
                ...entitlement,
                allocation: entitlement.valueNumeric || 0,
                usage: 0,
                quantity: 1,
              })),
          );

        setAddOnUsageBasedEntitlements(updatedAddOnEntitlements);

        handlePreviewCheckout({
          addOns: updated,
          addOnPayInAdvanceEntitlements: updatedAddOnEntitlements,
        });

        return updated;
      });
    },
    [handlePreviewCheckout],
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
            ({ priceBehavior }) => priceBehavior === PriceBehavior.PayInAdvance,
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

        handlePreviewCheckout({
          addOnPayInAdvanceEntitlements: updated,
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

  // this is needed to run the `selectPlan` logic on initial load
  // if the user is already on an available plan
  const hasInitializedPlan = useRef(false);

  useEffect(() => {
    if (!hasInitializedPlan.current && selectedPlan) {
      hasInitializedPlan.current = true;
      selectPlan({ plan: selectedPlan, period: currentPeriod });
    }
  }, [selectedPlan, currentPeriod, selectPlan]);

  useEffect(() => {
    if (checkoutState?.planId) {
      const plan = availablePlans.find(
        (plan) => plan.id === checkoutState.planId,
      );

      // Only call selectPlan if the plan actually changed to avoid redundant API calls
      if (plan && plan.id !== selectedPlan?.id) {
        selectPlan({ plan, period: currentPeriod });
      }
    }
  }, [
    availablePlans,
    checkoutState?.planId,
    currentPeriod,
    selectPlan,
    selectedPlan?.id,
  ]);

  useEffect(() => {
    setAddOns((prevAddOns) => {
      return availableAddOns
        .filter((availAddOn) => {
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
        .map((addOn) => {
          const prevAddOn = prevAddOns.find((prev) => prev.id === addOn.id);

          return {
            ...addOn,
            isSelected: prevAddOn?.isSelected ?? false,
          };
        });
    });
  }, [data?.addOnCompatibilities, availableAddOns, selectedPlan]);

  useEffect(() => {
    if (charges) {
      sidebarRef.current?.scrollTo({
        top: 0,
        left: 0,
        behavior: "smooth",
      });
    }
  }, [charges]);

  useLayoutEffect(() => {
    stageRef.current?.scrollTo({
      top: 0,
      left: 0,
      behavior: "smooth",
    });
  }, [checkoutStage]);

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

  return (
    <Modal ref={modalRef} size="lg" top={top}>
      {shouldShowBypassOverlay && (
        <Flex
          $position="absolute"
          $top={0}
          $left={0}
          $zIndex={3}
          $width="100%"
          $height="100dvh"
          $justifyContent="center"
          $alignItems="center"
          $backgroundColor={
            isLightBackground
              ? "hsla(0, 0%, 100%, 0.9)"
              : "hsla(0, 0%, 0%, 0.9)"
          }
          $backdropFilter="blur(8px)"
          $padding="1rem"
          $viewport={{
            md: {
              $padding: "1.5rem",
            },
          }}
        >
          <Loader $color={settings.theme.primary} $size="2xl" />
        </Flex>
      )}

      <ModalHeader bordered>
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
              onSelect={() => setCheckoutStage(stage.id)}
            />
          ))}
        </Flex>
      </ModalHeader>

      <ModalContent ref={contentRef}>
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
            />
          ) : checkoutStage === "usage" ? (
            <Usage
              isLoading={isLoading}
              period={planPeriod}
              selectedPlan={selectedPlan}
              entitlements={payInAdvanceEntitlements}
              updateQuantity={updateUsageBasedEntitlementQuantity}
            />
          ) : checkoutStage === "addons" ? (
            <AddOns
              isLoading={isLoading}
              period={planPeriod}
              addOns={addOns}
              toggle={(id) => toggleAddOn(id)}
            />
          ) : checkoutStage === "addonsUsage" ? (
            <Usage
              isLoading={isLoading}
              period={planPeriod}
              selectedPlan={selectedPlan}
              entitlements={addOnPayInAdvanceEntitlements}
              updateQuantity={updateAddOnEntitlementQuantity}
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

        <Sidebar
          ref={sidebarRef}
          planPeriod={planPeriod}
          selectedPlan={selectedPlan}
          addOns={addOns}
          usageBasedEntitlements={usageBasedEntitlements}
          addOnUsageBasedEntitlements={addOnUsageBasedEntitlements}
          creditBundles={creditBundles}
          charges={charges}
          checkoutStage={checkoutStage}
          checkoutStages={checkoutStages}
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
        />
      </ModalContent>
    </Modal>
  );
};
