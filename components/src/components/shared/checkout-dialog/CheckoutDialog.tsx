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
  type FeatureUsageResponseData,
  type PlanEntitlementResponseData,
  type PreviewSubscriptionFinanceResponseData,
  type UpdateAddOnRequestBody,
  type UpdatePayInAdvanceRequestBody,
} from "../../../api/checkoutexternal";
import {
  useAvailablePlans,
  useEmbed,
  useIsLightBackground,
  type SelectedPlan,
} from "../../../hooks";
import { getAddOnPrice, isCheckoutData, isHydratedPlan } from "../../../utils";
import { PeriodToggle } from "../../shared";
import { Flex, Modal, ModalHeader, Text } from "../../ui";
import { Sidebar, type UsageBasedEntitlement } from "../sidebar";

import { AddOns } from "./AddOns";
import { Checkout } from "./Checkout";
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
      const allocation = featureUsage?.allocation || 0;
      const usage = featureUsage?.usage || 0;

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

export const CheckoutDialog = ({ top = 0 }: CheckoutDialogProps) => {
  const { t } = useTranslation();

  const { data, checkoutState, previewCheckout } = useEmbed();

  const modalRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const checkoutRef = useRef<HTMLDivElement>(null);

  const [charges, setCharges] =
    useState<PreviewSubscriptionFinanceResponseData>();

  const [paymentMethodId, setPaymentMethodId] = useState<string | undefined>(
    () => {
      if (isCheckoutData(data)) {
        return (
          data.subscription?.paymentMethod || data.company?.defaultPaymentMethod
        )?.externalId;
      }
    },
  );

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [planPeriod, setPlanPeriod] = useState(() => {
    if (checkoutState?.period) {
      return checkoutState.period;
    }

    if (isCheckoutData(data) && data.company?.plan?.planPeriod) {
      return data.company.plan.planPeriod;
    }

    return "month";
  });

  const {
    plans: availablePlans,
    addOns: availableAddOns,
    periods: availablePeriods,
  } = useAvailablePlans(planPeriod);

  const {
    currentPlanId,
    currentEntitlements,
    isTrialing,
    trialPaymentMethodRequired,
  } = useMemo(() => {
    if (isCheckoutData(data)) {
      return {
        currentPlanId: data.company?.plan?.id,
        currentEntitlements: data.featureUsage
          ? data.featureUsage.features
          : [],
        isTrialing: data.subscription?.status === "trialing",
        trialPaymentMethodRequired: data.trialPaymentMethodRequired === true,
      };
    }

    return {
      currentPlanId: undefined,
      currentEntitlements: [],
      isTrialing: false,
      trialPaymentMethodRequired: false,
    };
  }, [data]);

  const [selectedPlan, setSelectedPlan] = useState(() =>
    availablePlans.find((plan) =>
      checkoutState?.planId
        ? plan.id === checkoutState.planId
        : isHydratedPlan(plan) && plan.current,
    ),
  );

  const [willTrial, setWillTrial] = useState(
    !isTrialing && !trialPaymentMethodRequired,
  );

  const [addOns, setAddOns] = useState(() => {
    if (isCheckoutData(data)) {
      return availableAddOns.map((addOn) => ({
        ...addOn,
        isSelected:
          typeof checkoutState?.addOnId !== "undefined"
            ? addOn.id === checkoutState.addOnId
            : (data.company?.addOns || []).some(
                (currentAddOn) => addOn.id === currentAddOn.id,
              ),
      }));
    }

    return [];
  });
  const hasActiveAddOns = addOns.some((addOn) => addOn.isSelected);

  const [usageBasedEntitlements, setUsageBasedEntitlements] = useState(() =>
    (selectedPlan?.entitlements || []).reduce(
      createActiveUsageBasedEntitlementsReducer(
        currentEntitlements,
        planPeriod,
      ),
      [],
    ),
  );

  const payInAdvanceEntitlements = useMemo(
    () =>
      usageBasedEntitlements.filter(
        (entitlement) => entitlement.priceBehavior === "pay_in_advance",
      ),
    [usageBasedEntitlements],
  );
  const hasActivePayInAdvanceEntitlements = payInAdvanceEntitlements.some(
    ({ quantity }) => quantity > 0,
  );

  const [promoCode, setPromoCode] = useState<string>();

  const isTrialable =
    isHydratedPlan(selectedPlan) &&
    selectedPlan.isTrialable &&
    selectedPlan.companyCanTrial;
  const isTrialableAndFree = isTrialable && !trialPaymentMethodRequired;
  const planRequiresPayment =
    !isTrialableAndFree || (!isTrialable && !selectedPlan.isFree);
  const requiresPayment =
    planRequiresPayment || hasActiveAddOns || hasActivePayInAdvanceEntitlements;

  const checkoutStages = useMemo(() => {
    const stages: CheckoutStage[] = [
      {
        id: "plan",
        name: t("Plan"),
        label: t("Select plan"),
        description: t("Choose your base plan"),
      },
    ];

    if (willTrial) {
      return stages;
    }

    if (payInAdvanceEntitlements.length > 0) {
      stages.push({
        id: "usage",
        name: t("Quantity"),
      });
    }

    if (availableAddOns.length) {
      stages.push({
        id: "addons",
        name: t("Add-ons"),
        label: t("Select add-ons"),
        description: t("Optionally add features to your subscription"),
      });
    }

    if (requiresPayment) {
      stages.push({
        id: "checkout",
        name: t("Checkout"),
        label: t("Checkout"),
      });
    }

    return stages;
  }, [
    t,
    willTrial,
    payInAdvanceEntitlements,
    availableAddOns,
    requiresPayment,
  ]);

  const [checkoutStage, setCheckoutStage] = useState(() => {
    if (checkoutState?.addOnId) {
      return "addons";
    }

    if (checkoutState?.usage) {
      return "usage";
    }

    // the user has preselected a different plan before starting the checkout flow
    if (checkoutState?.planId !== currentPlanId) {
      return checkoutStages.some((stage) => stage.id === "usage")
        ? "usage"
        : checkoutStages.some((stage) => stage.id === "addons")
          ? "addons"
          : "plan";
    }

    return "plan";
  });

  const isLightBackground = useIsLightBackground();

  const handlePreviewCheckout = useCallback(
    async (updates: {
      period?: string;
      plan?: SelectedPlan;
      addOns?: SelectedPlan[];
      payInAdvanceEntitlements?: UsageBasedEntitlement[];
      promoCode?: string;
    }) => {
      const period = updates.period || planPeriod;
      const plan = updates.plan || selectedPlan;

      const planPriceId =
        period === "year" ? plan?.yearlyPrice?.id : plan?.monthlyPrice?.id;
      if (!plan || !planPriceId) {
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
          payInAdvance: (
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
          promoCode: updates.promoCode || promoCode,
        });

        if (response) {
          setCharges(response.data.finance);
        }
      } catch (err) {
        if (err instanceof ResponseError && err.response.status === 401) {
          const data = await err.response.json();
          if (data.error === "Access Token Invalid") {
            return setError(
              t("Session expired. Please refresh and try again."),
            );
          }
        }

        setError(
          t("Error retrieving plan details. Please try again in a moment."),
        );
      } finally {
        setIsLoading(false);
      }
    },
    [
      t,
      previewCheckout,
      planPeriod,
      selectedPlan,
      addOns,
      payInAdvanceEntitlements,
      promoCode,
    ],
  );

  const selectPlan = useCallback(
    (updates: {
      plan?: SelectedPlan;
      period?: string;
      shouldTrial?: boolean;
    }) => {
      const plan = updates.plan || selectedPlan;
      if (!plan) {
        return;
      }

      const period = updates.period || planPeriod;
      const entitlements = plan.entitlements.reduce(
        createActiveUsageBasedEntitlementsReducer(currentEntitlements, period),
        [],
      );

      if (updates.plan) {
        setSelectedPlan(plan);
        setUsageBasedEntitlements(entitlements);
      }

      const shouldTrial = updates.shouldTrial ?? false;
      setWillTrial(shouldTrial && !trialPaymentMethodRequired);

      handlePreviewCheckout({
        period: period,
        plan: updates.plan,
        payInAdvanceEntitlements: entitlements.filter(
          ({ priceBehavior }) => priceBehavior === "pay_in_advance",
        ),
      });
    },
    [
      planPeriod,
      selectedPlan,
      currentEntitlements,
      trialPaymentMethodRequired,
      handlePreviewCheckout,
    ],
  );

  const changePlanPeriod = useCallback(
    (period: string) => {
      setPlanPeriod(period);
      handlePreviewCheckout({ period });
    },
    [setPlanPeriod, handlePreviewCheckout],
  );

  const toggleAddOn = (id: string) => {
    setAddOns((prev) => {
      const updated = prev.map((addOn) => ({
        ...addOn,
        ...(addOn.id === id && { isSelected: !addOn.isSelected }),
      }));

      handlePreviewCheckout({ addOns: updated });

      return updated;
    });
  };

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
            ({ priceBehavior }) => priceBehavior === "pay_in_advance",
          ),
        });

        return updated;
      });
    },
    [handlePreviewCheckout],
  );

  const updatePromoCode = (code?: string) => {
    setPromoCode(code);
    handlePreviewCheckout({ promoCode: code });
  };

  useEffect(() => {
    if (charges) {
      checkoutRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [charges]);

  useLayoutEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTo({
        top: 0,
        left: 0,
        behavior: "smooth",
      });
    }
  }, [checkoutStage]);

  const activeCheckoutStage = checkoutStages.find(
    (stage) => stage.id === checkoutStage,
  );

  return (
    <Modal
      ref={modalRef}
      id="select-plan-dialog"
      size="lg"
      top={top}
      contentRef={contentRef}
    >
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
          {checkoutStages.map((stage, index, stages) => (
            <Navigation
              key={stage.id}
              name={stage.name}
              index={index}
              activeIndex={checkoutStages.findIndex(
                (s) => s.id === checkoutStage,
              )}
              isLast={index === stages.length - 1}
              onClick={() => setCheckoutStage(stage.id)}
            />
          ))}
        </Flex>
      </ModalHeader>

      <Flex
        $position="relative"
        $flexDirection="column"
        $height="auto"
        $viewport={{
          md: {
            $flexDirection: "row",
            $height: "calc(100% - 5rem)",
          },
        }}
      >
        <Flex
          $flexDirection="column"
          $flexGrow="1"
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
              <Flex
                $flexDirection="column"
                $alignItems="center"
                $gap="0.25rem"
                $viewport={{
                  md: {
                    $alignItems: "start",
                  },
                }}
              >
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

            {checkoutStage === "plan" && availablePeriods.length > 1 && (
              <PeriodToggle
                layerRef={modalRef}
                options={availablePeriods}
                selectedOption={planPeriod}
                selectedPlan={selectedPlan}
                onChange={changePlanPeriod}
              />
            )}
          </Flex>

          {checkoutStage === "plan" && (
            <Plan
              isLoading={isLoading}
              period={planPeriod}
              plans={availablePlans}
              selectedPlan={selectedPlan}
              selectPlan={selectPlan}
              willTrial={willTrial}
            />
          )}

          {checkoutStage === "usage" && (
            <Usage
              isLoading={isLoading}
              period={planPeriod}
              selectedPlan={selectedPlan}
              entitlements={usageBasedEntitlements}
              updateQuantity={updateUsageBasedEntitlementQuantity}
            />
          )}

          {checkoutStage === "addons" && (
            <AddOns
              isLoading={isLoading}
              period={planPeriod}
              addOns={addOns}
              toggle={(id) => toggleAddOn(id)}
            />
          )}

          {checkoutStage === "checkout" && (
            <Checkout
              requiresPayment={requiresPayment}
              setPaymentMethodId={(id) => setPaymentMethodId(id)}
              updatePromoCode={(code) => updatePromoCode(code)}
            />
          )}
        </Flex>

        <Sidebar
          planPeriod={planPeriod}
          selectedPlan={selectedPlan}
          addOns={addOns}
          usageBasedEntitlements={usageBasedEntitlements}
          charges={charges}
          checkoutRef={checkoutRef}
          checkoutStage={checkoutStage}
          checkoutStages={checkoutStages}
          error={error}
          isLoading={isLoading}
          paymentMethodId={paymentMethodId}
          promoCode={promoCode}
          requiresPayment={requiresPayment}
          setCheckoutStage={(stage) => setCheckoutStage(stage)}
          setError={(msg) => setError(msg)}
          setIsLoading={setIsLoading}
          updatePromoCode={(code) => updatePromoCode(code)}
          willTrial={willTrial}
        />
      </Flex>
    </Modal>
  );
};
