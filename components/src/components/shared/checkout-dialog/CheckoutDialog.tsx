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
import { PriceBehavior } from "../../../const";
import {
  useAvailablePlans,
  useEmbed,
  useIsLightBackground,
  type SelectedPlan,
} from "../../../hooks";
import type { UsageBasedEntitlement } from "../../../types";
import {
  ERROR_UNKNOWN,
  getAddOnPrice,
  isCheckoutData,
  isError,
  isHydratedPlan,
} from "../../../utils";
import { PeriodToggle } from "../../shared";
import { Flex, Modal, ModalHeader, Text } from "../../ui";
import { Sidebar } from "../sidebar";

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
      const allocation = featureUsage?.allocation || 1;
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

  const isLightBackground = useIsLightBackground();

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

  const currentPeriod = useMemo(
    () =>
      checkoutState?.period ||
      (isCheckoutData(data) && data.company?.plan?.planPeriod) ||
      "month",
    [data, checkoutState?.period],
  );

  const [planPeriod, setPlanPeriod] = useState(currentPeriod);

  const {
    plans: availablePlans,
    addOns: availableAddOns,
    periods: availablePeriods,
  } = useAvailablePlans(planPeriod);

  const { currentPlanId, currentEntitlements, trialPaymentMethodRequired } =
    useMemo(() => {
      if (isCheckoutData(data)) {
        return {
          currentPlanId: data.company?.plan?.id,
          currentEntitlements: data.featureUsage
            ? data.featureUsage.features
            : [],
          trialPaymentMethodRequired: data.trialPaymentMethodRequired === true,
        };
      }

      return {
        currentPlanId: undefined,
        currentEntitlements: [],
        trialPaymentMethodRequired: false,
      };
    }, [data]);

  const [selectedPlan, setSelectedPlan] = useState<SelectedPlan | undefined>(
    () => {
      const currentSelectedPlan = availablePlans.find((plan) =>
        checkoutState?.planId
          ? plan.id === checkoutState.planId
          : isHydratedPlan(plan) && plan.current,
      );

      return currentSelectedPlan;
    },
  );

  const [shouldTrial, setShouldTrial] = useState(false);

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
        (entitlement) =>
          entitlement.priceBehavior === PriceBehavior.PayInAdvance,
      ),
    [usageBasedEntitlements],
  );

  const [promoCode, setPromoCode] = useState<string | null>(null);

  const [isPaymentMethodRequired, setIsPaymentMethodRequired] = useState(false);

  const willTrialWithoutPaymentMethod = useMemo(
    () => shouldTrial && !trialPaymentMethodRequired,
    [shouldTrial, trialPaymentMethodRequired],
  );

  const isSelectedPlanTrialable =
    isHydratedPlan(selectedPlan) &&
    selectedPlan.isTrialable &&
    selectedPlan.companyCanTrial;

  const checkoutStages = useMemo(() => {
    const stages: CheckoutStage[] = [];

    if (availablePlans) {
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
    addOns,
    payInAdvanceEntitlements,
    shouldTrial,
    willTrialWithoutPaymentMethod,
    isSelectedPlanTrialable,
    isPaymentMethodRequired,
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

  const handlePreviewCheckout = useCallback(
    async (updates: {
      period?: string;
      plan?: SelectedPlan;
      shouldTrial?: boolean;
      addOns?: SelectedPlan[];
      payInAdvanceEntitlements?: UsageBasedEntitlement[];
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
          creditBundles: [],
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
      }
    },
    [
      t,
      previewCheckout,
      planPeriod,
      selectedPlan,
      payInAdvanceEntitlements,
      addOns,
      shouldTrial,
      promoCode,
    ],
  );

  const selectPlan = useCallback(
    (updates: {
      plan: SelectedPlan;
      period?: string;
      shouldTrial?: boolean;
    }) => {
      const plan = updates.plan;
      const period = updates.period || planPeriod;
      const entitlements = plan.entitlements.reduce(
        (acc: UsageBasedEntitlement[], entitlement) => {
          if (
            entitlement.priceBehavior &&
            ((period === "month" && entitlement.meteredMonthlyPrice) ||
              (period === "year" && entitlement.meteredYearlyPrice))
          ) {
            acc.push({
              ...entitlement,
              allocation: entitlement.valueNumeric || 0,
              usage: 0,
              quantity:
                entitlement.priceBehavior === PriceBehavior.PayInAdvance
                  ? 1
                  : 0,
            });
          }

          return acc;
        },
        [],
      );

      setSelectedPlan(plan);
      setUsageBasedEntitlements(entitlements);

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
              payInAdvanceEntitlements: entitlements.filter(
                ({ priceBehavior }) =>
                  priceBehavior === PriceBehavior.PayInAdvance,
              ),
            }),
      });
    },
    [
      planPeriod,
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

        handlePreviewCheckout({ addOns: updated });

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

  const updatePromoCode = useCallback(
    async (code: string | null) => {
      handlePreviewCheckout({ promoCode: code });
    },
    [handlePreviewCheckout],
  );

  // this is needed to run the `selectPlan` logic on initial load
  // if the user is already on an available plan
  useEffect(() => {
    if (selectedPlan) {
      selectPlan({ plan: selectedPlan, period: currentPeriod });
    }

    // adding dependencies will cause an endless loop since `selectPlan` updates the value of `selectedPlan`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  }, [availableAddOns, data?.addOnCompatibilities, selectedPlan]);

  useEffect(() => {
    if (charges) {
      checkoutRef.current?.scrollTo({
        top: 0,
        left: 0,
        behavior: "smooth",
      });
    }
  }, [charges]);

  useLayoutEffect(() => {
    contentRef.current?.scrollTo({
      top: 0,
      left: 0,
      behavior: "smooth",
    });
  }, [checkoutStage]);

  const activeCheckoutStage = checkoutStages.find(
    (stage) => stage.id === checkoutStage,
  );

  return (
    <Modal size="lg" top={top} contentRef={contentRef}>
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
              onSelect={() => setCheckoutStage(stage.id)}
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

            {checkoutStage === "plan" && availablePeriods.length > 1 && (
              <PeriodToggle
                options={availablePeriods}
                selectedOption={planPeriod}
                selectedPlan={selectedPlan}
                onSelect={changePlanPeriod}
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
              shouldTrial={shouldTrial}
            />
          )}

          {checkoutStage === "usage" && (
            <Usage
              isLoading={isLoading}
              period={planPeriod}
              selectedPlan={selectedPlan}
              entitlements={payInAdvanceEntitlements}
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
              isPaymentMethodRequired={isPaymentMethodRequired}
              setPaymentMethodId={(id) => setPaymentMethodId(id)}
              updatePromoCode={updatePromoCode}
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
          isPaymentMethodRequired={isPaymentMethodRequired}
          paymentMethodId={paymentMethodId}
          promoCode={promoCode}
          setCheckoutStage={(stage) => setCheckoutStage(stage)}
          setError={(msg) => setError(msg)}
          setIsLoading={setIsLoading}
          updatePromoCode={updatePromoCode}
          shouldTrial={shouldTrial}
          willTrialWithoutPaymentMethod={willTrialWithoutPaymentMethod}
        />
      </Flex>
    </Modal>
  );
};
