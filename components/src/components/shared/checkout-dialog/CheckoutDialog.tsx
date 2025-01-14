import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import type {
  CompanyPlanDetailResponseData,
  PlanEntitlementResponseData,
  PreviewSubscriptionChangeResponseData,
  SetupIntentResponseData,
  UpdateAddOnRequestBody,
  UpdatePayInAdvanceRequestBody,
  UsageBasedEntitlementResponseData,
} from "../../../api";
import {
  useAvailablePlans,
  useEmbed,
  useIsLightBackground,
} from "../../../hooks";
import { PeriodToggle } from "../../shared";
import { Flex, Modal, ModalHeader, Text } from "../../ui";
import { Navigation } from "./Navigation";
import { Sidebar } from "./Sidebar";
import { Plan } from "./Plan";
import { AddOns } from "./AddOns";
import { Usage } from "./Usage";
import { Checkout } from "./Checkout";

export interface CheckoutDialogProps {
  top?: number;
}

export const CheckoutDialog = ({ top = 0 }: CheckoutDialogProps) => {
  const { t } = useTranslation();

  const theme = useTheme();

  const { api, data, selected } = useEmbed();

  const modalRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const checkoutRef = useRef<HTMLDivElement>(null);

  const [checkoutStage, setCheckoutStage] = useState(() =>
    selected.addOnId ? "addons" : selected.usage ? "usage" : "plan",
  );
  const [planPeriod, setPlanPeriod] = useState(
    selected.period || data.company?.plan?.planPeriod || "month",
  );
  const [charges, setCharges] =
    useState<PreviewSubscriptionChangeResponseData>();
  const [paymentMethodId, setPaymentMethodId] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [showPaymentForm, setShowPaymentForm] = useState(
    !data.subscription?.paymentMethod,
  );
  const [stripe, setStripe] = useState<Promise<Stripe | null> | null>(null);
  const [setupIntent, setSetupIntent] = useState<SetupIntentResponseData>();
  const [promoCode, setPromoCode] = useState<string>();

  const {
    plans: availablePlans,
    addOns: availableAddOns,
    periods: availablePeriods,
  } = useAvailablePlans(planPeriod);

  const currentPlan = data.company?.plan;
  const [selectedPlan, setSelectedPlan] = useState(() => {
    const p = availablePlans.find(
      (plan) =>
        plan.id ===
        (typeof selected.planId !== "undefined"
          ? selected.planId
          : currentPlan?.id),
    );

    if (!p) {
      return undefined;
    }

    return p;
  });

  const currentAddOns = data.company?.addOns || [];
  const [addOns, setAddOns] = useState(() =>
    availableAddOns.map((addOn) => ({
      ...addOn,
      isSelected:
        typeof selected.addOnId !== "undefined"
          ? addOn.id === selected.addOnId
          : currentAddOns.some((currentAddOn) => addOn.id === currentAddOn.id),
    })),
  );

  const currentUsageBasedEntitlements =
    data.activeUsageBasedEntitlements.reduce(
      (
        acc: {
          usageData: UsageBasedEntitlementResponseData;
          allocation: number;
          quantity: number;
          usage: number;
        }[],
        usageData,
      ) => {
        const featureUsage = data.featureUsage?.features.find(
          (usage) => usage.feature?.id === usageData.featureId,
        );
        const allocation = featureUsage?.allocation || 0;
        const usage = featureUsage?.usage || 0;

        acc.push({
          usageData,
          allocation,
          quantity: allocation ?? usage,
          usage,
        });

        return acc;
      },
      [],
    );

  const createActiveUsageBasedEntitlementsReducer = useCallback(
    (period = planPeriod) =>
      (
        acc: {
          entitlement: PlanEntitlementResponseData;
          allocation: number;
          quantity: number;
          usage: number;
        }[],
        entitlement: PlanEntitlementResponseData,
      ) => {
        if (
          entitlement.priceBehavior &&
          ((period === "month" && entitlement.meteredMonthlyPrice) ||
            (period === "year" && entitlement.meteredYearlyPrice))
        ) {
          const featureUsage = data.featureUsage?.features.find(
            (usage) => usage.feature?.id === entitlement.feature?.id,
          );
          const allocation = featureUsage?.allocation || 0;
          const usage = featureUsage?.usage || 0;
          acc.push({
            entitlement,
            allocation,
            quantity: allocation ?? usage,
            usage,
          });
        }

        return acc;
      },
    [planPeriod, data.featureUsage?.features],
  );

  const [usageBasedEntitlements, setUsageBasedEntitlements] = useState(() => {
    return (selectedPlan?.entitlements || []).reduce(
      createActiveUsageBasedEntitlementsReducer(),
      [],
    );
  });

  const payInAdvanceEntitlements = useMemo(() => {
    return usageBasedEntitlements.filter(
      ({ entitlement }) => entitlement.priceBehavior === "pay_in_advance",
    );
  }, [usageBasedEntitlements]);

  const checkoutStages = useMemo(() => {
    const stages: {
      id: string;
      name: string;
      label?: string;
      description?: string;
    }[] = [
      {
        id: "plan",
        name: t("Plan"),
        label: t("Select plan"),
        description: t("Choose your base plan"),
      },
    ];

    if (payInAdvanceEntitlements.length) {
      stages.push({
        id: "usage",
        name: t("Quantity"),
      });
    }

    if (availableAddOns.length && !selectedPlan?.companyCanTrial) {
      stages.push({
        id: "addons",
        name: t("Add-ons"),
        label: t("Select add-ons"),
        description: t("Optionally add features to your subscription"),
      });
    }

    if (!selectedPlan?.companyCanTrial || data.trialPaymentMethodRequired) {
      stages.push({
        id: "checkout",
        name: t("Checkout"),
        label: t("Checkout"),
      });
    }

    return stages;
  }, [
    t,
    payInAdvanceEntitlements,
    availableAddOns,
    selectedPlan?.companyCanTrial,
    data.trialPaymentMethodRequired,
  ]);

  const isLightBackground = useIsLightBackground();

  const previewCheckout = useCallback(
    async ({
      plan,
      addOns,
      entitlements,
      period,
      discount,
    }: {
      plan: CompanyPlanDetailResponseData;
      addOns: (CompanyPlanDetailResponseData & { isSelected: boolean })[];
      entitlements: {
        entitlement: PlanEntitlementResponseData;
        allocation: number;
        quantity: number;
      }[];
      period?: string;
      discount?: string;
    }) => {
      const periodValue = period || planPeriod;
      const planPriceId =
        periodValue === "month"
          ? plan?.monthlyPrice?.id
          : plan?.yearlyPrice?.id;
      if (!api || !planPriceId) {
        return;
      }

      const promoCodeValue = discount ?? promoCode;

      try {
        setError(undefined);
        setCharges(undefined);
        setIsLoading(true);

        const payInAdvance = entitlements.reduce(
          (acc: UpdatePayInAdvanceRequestBody[], { entitlement, quantity }) => {
            const priceId = (
              periodValue === "month"
                ? entitlement.meteredMonthlyPrice
                : entitlement.meteredYearlyPrice
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
        );
        const { data } = await api.previewCheckout({
          changeSubscriptionRequestBody: {
            newPlanId: plan.id,
            newPriceId: planPriceId,
            addOnIds: addOns.reduce((acc: UpdateAddOnRequestBody[], addOn) => {
              if (addOn.isSelected) {
                const addOnPriceId = (
                  periodValue === "month"
                    ? addOn?.monthlyPrice
                    : addOn?.yearlyPrice
                )?.id;

                if (addOnPriceId) {
                  acc.push({
                    addOnId: addOn.id,
                    priceId: addOnPriceId,
                  });
                }
              }

              return acc;
            }, []),
            payInAdvance,
            promoCode: promoCodeValue,
          },
        });

        setCharges(data);
      } catch {
        setError(
          t("Error retrieving plan details. Please try again in a moment."),
        );
      } finally {
        setIsLoading(false);

        if (!period) {
          checkoutRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
          });
        }
      }
    },
    [t, api, planPeriod, promoCode],
  );

  const selectPlan = useCallback(
    (
      updatedPlan: CompanyPlanDetailResponseData & { isSelected: boolean },
      updatedPeriod?: string,
    ) => {
      const entitlements = updatedPlan.entitlements.reduce(
        createActiveUsageBasedEntitlementsReducer(updatedPeriod),
        [],
      );
      const updatedPayInAdvanceEntitlements = entitlements.filter(
        ({ entitlement }) => entitlement.priceBehavior === "pay_in_advance",
      );
      setSelectedPlan(updatedPlan);
      setUsageBasedEntitlements(entitlements);
      previewCheckout({
        plan: updatedPlan,
        addOns,
        entitlements: updatedPayInAdvanceEntitlements,
        period: updatedPeriod,
      });
    },
    [addOns, previewCheckout, createActiveUsageBasedEntitlementsReducer],
  );

  const toggleAddOn = useCallback(
    (id: string, updatedPeriod?: string) => {
      const updatedAddOns = addOns.map((addOn) => ({
        ...addOn,
        ...(addOn.id === id && { isSelected: !addOn.isSelected }),
      }));
      setAddOns(updatedAddOns);

      if (!selectedPlan) {
        return;
      }

      previewCheckout({
        plan: selectedPlan,
        addOns: updatedAddOns,
        entitlements: payInAdvanceEntitlements,
        period: updatedPeriod || planPeriod,
      });
    },
    [
      selectedPlan,
      addOns,
      payInAdvanceEntitlements,
      planPeriod,
      previewCheckout,
    ],
  );

  const changePlanPeriod = useCallback(
    (period: string) => {
      if (selectedPlan) {
        selectPlan(selectedPlan, period);
      }

      setPlanPeriod(period);
    },
    [selectedPlan, selectPlan, setPlanPeriod],
  );

  const updateUsageBasedEntitlementQuantity = useCallback(
    (id: string, updatedQuantity: number) => {
      let shouldPreview = true;
      const entitlements = payInAdvanceEntitlements.map(
        ({ entitlement, allocation, quantity, usage }) => {
          if (entitlement.id === id) {
            if (updatedQuantity < usage) {
              shouldPreview = false;
            }

            return {
              entitlement,
              allocation,
              quantity: updatedQuantity,
              usage,
            };
          }

          return { entitlement, allocation, quantity, usage };
        },
      );

      setUsageBasedEntitlements((prev) =>
        prev.map(({ entitlement, allocation, quantity, usage }) =>
          entitlement.id === id
            ? {
                entitlement,
                allocation,
                quantity: updatedQuantity,
                usage,
              }
            : { entitlement, allocation, quantity, usage },
        ),
      );

      if (!selectedPlan || !shouldPreview) {
        return;
      }

      previewCheckout({
        plan: selectedPlan,
        addOns,
        entitlements,
        period: planPeriod,
      });
    },
    [
      selectedPlan,
      addOns,
      payInAdvanceEntitlements,
      planPeriod,
      previewCheckout,
    ],
  );

  const updatePromoCode = useCallback(
    (code?: string) => {
      setPromoCode(code);

      if (!selectedPlan) {
        return;
      }

      previewCheckout({
        plan: selectedPlan,
        addOns,
        entitlements: payInAdvanceEntitlements,
        period: planPeriod,
        discount: code,
      });
    },
    [
      selectedPlan,
      addOns,
      payInAdvanceEntitlements,
      planPeriod,
      previewCheckout,
    ],
  );

  useEffect(() => {
    if (!stripe && setupIntent?.publishableKey) {
      setStripe(loadStripe(setupIntent.publishableKey));
    }
  }, [stripe, setupIntent?.publishableKey]);

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
                    $font={theme.typography.heading3.fontFamily}
                    $size={theme.typography.heading3.fontSize}
                    $weight={theme.typography.heading3.fontWeight}
                    $color={theme.typography.heading3.color}
                    $marginBottom="0.5rem"
                  >
                    {activeCheckoutStage.label}
                  </Text>
                )}

                {activeCheckoutStage.description && (
                  <Text
                    as="p"
                    $font={theme.typography.text.fontFamily}
                    $size={theme.typography.text.fontSize}
                    $weight={theme.typography.text.fontWeight}
                    $color={theme.typography.text.color}
                  >
                    {activeCheckoutStage.description}
                  </Text>
                )}
              </Flex>
            )}

            {checkoutStage === "plan" && (
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
              currentPlan={currentPlan}
              selectedPlan={selectedPlan}
              selectPlan={selectPlan}
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
              setupIntent={setupIntent}
              showPaymentForm={showPaymentForm}
              stripe={stripe}
              setPaymentMethodId={(id) => setPaymentMethodId(id)}
              togglePaymentForm={() => setShowPaymentForm((prev) => !prev)}
              updatePromoCode={(code) => updatePromoCode(code)}
            />
          )}
        </Flex>

        <Sidebar
          addOns={addOns}
          charges={charges}
          checkoutRef={checkoutRef}
          checkoutStage={checkoutStage}
          currentAddOns={currentAddOns}
          currentPlan={currentPlan}
          currentUsageBasedEntitlements={currentUsageBasedEntitlements}
          error={error}
          isLoading={isLoading}
          paymentMethodId={paymentMethodId}
          planPeriod={planPeriod}
          promoCode={promoCode}
          selectedPlan={selectedPlan}
          setCheckoutStage={(stage) => setCheckoutStage(stage)}
          setError={(msg) => setError(msg)}
          setSetupIntent={(intent) => setSetupIntent(intent)}
          showPaymentForm={showPaymentForm}
          toggleLoading={() => setIsLoading((prev) => !prev)}
          updatePromoCode={(code) => updatePromoCode(code)}
          usageBasedEntitlements={usageBasedEntitlements}
        />
      </Flex>
    </Modal>
  );
};
