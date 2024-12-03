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
  SetupIntentResponseData,
  UpdateAddOnRequestBody,
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
  initialPeriod?: string;
  initialPlanId?: string | null;
  initialAddOnId?: string | null;
  portal?: HTMLElement;
}

export const CheckoutDialog = ({
  initialPeriod,
  initialPlanId,
  initialAddOnId,
  portal,
}: CheckoutDialogProps) => {
  const { t } = useTranslation();

  const theme = useTheme();

  const { api, data } = useEmbed();

  const modalRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const checkoutRef = useRef<HTMLDivElement>(null);

  const [checkoutStage, setCheckoutStage] = useState("plan");
  const [planPeriod, setPlanPeriod] = useState(
    initialPeriod || data.company?.plan?.planPeriod || "month",
  );
  const [charges, setCharges] = useState<{
    dueNow: number;
    newCharges: number;
    proration: number;
    periodStart: Date;
  }>();
  const [paymentMethodId, setPaymentMethodId] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [showPaymentForm, setShowPaymentForm] = useState(
    !data.subscription?.paymentMethod,
  );
  const [stripe, setStripe] = useState<Promise<Stripe | null> | null>(null);
  const [setupIntent, setSetupIntent] = useState<SetupIntentResponseData>();
  const [top, setTop] = useState(0);

  const {
    plans: availablePlans,
    addOns: availableAddOns,
    periods: availablePeriods,
  } = useAvailablePlans(planPeriod);

  const testEntitlement = {
    createdAt: new Date(),
    environmentId: "1",
    feature: {
      createdAt: new Date(),
      description: "test",
      eventSubtype: "test",
      featureType: "test",
      icon: "wind",
      id: "1",
      lifecyclePhase: undefined,
      maintainerId: "1",
      name: "feature",
      traitId: "1",
      updatedAt: new Date(),
    },
    featureId: "1",
    id: "1",
    meteredMonthlyPrice: {
      createdAt: new Date(),
      currency: "usd",
      id: "1",
      interval: "month",
      meterId: "1",
      price: 100,
      priceExternalId: "1",
      priceId: "1",
      productExternalId: "1",
      productId: "1",
      productName: "test",
      updatedAt: new Date(),
      usageType: "",
    },
    meteredYearlyPrice: {
      createdAt: new Date(),
      currency: "usd",
      id: "mmp1",
      interval: "year",
      meterId: "1",
      price: 1000,
      priceExternalId: "1",
      priceId: "1",
      productExternalId: "1",
      productId: "1",
      productName: "test",
      updatedAt: new Date(),
      usageType: "metered",
    },
    metricPeriod: "month",
    metricPeriodMonthReset: "billing_cycle",
    planId: "1",
    priceBehavior: "pay_in_advance",
    ruleId: "1",
    updatedAt: new Date(),
    valueNumeric: undefined,
    valueType: "quantity",
  };

  const testifyPlan = (
    plan: CompanyPlanDetailResponseData & { isSelected: boolean },
  ) => {
    return {
      ...plan,
      entitlements: [...(plan?.entitlements || []), { ...testEntitlement }],
    };
  };

  // memoize data here since some state depends on it
  const currentPlan = data.company?.plan;
  const [selectedPlan, setSelectedPlan] = useState(() => {
    const p = availablePlans.find(
      (plan) =>
        plan.id ===
        (typeof initialPlanId !== "undefined"
          ? initialPlanId
          : currentPlan?.id),
    );

    if (!p) {
      return undefined;
    }

    return testifyPlan(p);
  });

  const currentAddOns = data.company?.addOns || [];
  const [addOns, setAddOns] = useState(() =>
    availableAddOns.map((addOn) => ({
      ...addOn,
      isSelected:
        typeof initialAddOnId !== "undefined"
          ? addOn.id === initialAddOnId
          : currentAddOns.some((currentAddOn) => addOn.id === currentAddOn.id),
    })),
  );

  const currentUsageBasedEntitlements = [
    ...data.activeUsageBasedEntitlements,
    { ...testEntitlement },
  ];
  const [usageBasedEntitlements, setUsageBasedEntitlements] = useState(() => {
    return (selectedPlan?.entitlements || []).reduce(
      (acc: PlanEntitlementResponseData[], entitlement) => {
        if (
          entitlement.priceBehavior === "pay_in_advance" &&
          ((planPeriod === "month" && entitlement.meteredMonthlyPrice) ||
            (planPeriod === "year" && entitlement.meteredYearlyPrice))
        ) {
          acc.push(entitlement);
        }

        return acc;
      },
      [],
    );
  });

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

    if (
      selectedPlan?.entitlements.filter(
        (entitlement) =>
          entitlement.priceBehavior === "pay_in_advance" &&
          ((planPeriod === "month" && entitlement.meteredMonthlyPrice) ||
            (planPeriod === "year" && entitlement.meteredYearlyPrice)),
      ).length
    ) {
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

    stages.push({ id: "checkout", name: t("Checkout"), label: t("Checkout") });

    return stages;
  }, [t, planPeriod, availableAddOns, selectedPlan?.entitlements]);

  const isLightBackground = useIsLightBackground();

  const previewCheckout = useCallback(
    async (
      plan: CompanyPlanDetailResponseData,
      addOns: (CompanyPlanDetailResponseData & { isSelected: boolean })[],
      newPeriod?: string,
    ) => {
      const period = newPeriod || planPeriod;
      const planPriceId =
        period === "month" ? plan?.monthlyPrice?.id : plan?.yearlyPrice?.id;
      if (!api || !planPriceId) {
        return;
      }

      try {
        setError(undefined);
        setCharges(undefined);
        setIsLoading(true);

        const { data } = await api.previewCheckout({
          changeSubscriptionRequestBody: {
            newPlanId: plan.id,
            newPriceId: planPriceId,
            addOnIds: addOns.reduce((acc: UpdateAddOnRequestBody[], addOn) => {
              if (addOn.isSelected) {
                const addOnPriceId = (
                  period === "month" ? addOn?.monthlyPrice : addOn?.yearlyPrice
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
          },
        });

        setCharges(data);
      } catch {
        setError(
          t("Error retrieving plan details. Please try again in a moment."),
        );
      } finally {
        setIsLoading(false);

        if (!newPeriod) {
          checkoutRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
          });
        }
      }
    },
    [t, api, planPeriod],
  );

  const selectPlan = useCallback(
    (
      plan: CompanyPlanDetailResponseData & { isSelected: boolean },
      newPeriod?: string,
    ) => {
      setSelectedPlan(plan);
      previewCheckout(plan, addOns, newPeriod);
    },
    [addOns, previewCheckout],
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

  // TODO
  const toggleAddOn = useCallback(
    (id: string, newPeriod?: string) => {
      const updatedAddOns = addOns.map((addOn) => ({
        ...addOn,
        ...(addOn.id === id && { isSelected: !addOn.isSelected }),
      }));
      setAddOns(updatedAddOns);

      if (!selectedPlan) {
        return;
      }

      previewCheckout(selectedPlan, updatedAddOns, newPeriod || planPeriod);
    },
    [selectedPlan, addOns, planPeriod, previewCheckout],
  );

  const updateUsageBasedEntitlementQuantity = useCallback(
    (id: string, quantity: number) => {
      setUsageBasedEntitlements((prev) =>
        prev.map((entitlement) =>
          entitlement.id === id
            ? { ...entitlement, valueNumeric: quantity }
            : entitlement,
        ),
      );
    },
    [setUsageBasedEntitlements],
  );

  useEffect(() => {
    if (!stripe && setupIntent?.publishableKey) {
      setStripe(loadStripe(setupIntent.publishableKey));
    }
  }, [stripe, setupIntent?.publishableKey]);

  useLayoutEffect(() => {
    const parent = portal || document.body;
    const value = Math.abs(parent.getBoundingClientRect().top ?? 0);
    setTop(value);

    parent.style.overflow = "hidden";

    return () => {
      parent.style.overflow = "";
    };
  }, [portal]);

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

            <PeriodToggle
              options={availablePeriods}
              selectedOption={planPeriod}
              selectedPlan={selectedPlan}
              onChange={changePlanPeriod}
              layerRef={modalRef}
            />
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
              setPaymentMethodId={(id) => setPaymentMethodId(id)}
              togglePaymentForm={() => setShowPaymentForm((prev) => !prev)}
              setupIntent={setupIntent}
              showPaymentForm={showPaymentForm}
              stripe={stripe}
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
          selectedPlan={selectedPlan}
          setCheckoutStage={(stage) => setCheckoutStage(stage)}
          setError={(msg) => setError(msg)}
          setSetupIntent={(intent) => setSetupIntent(intent)}
          showPaymentForm={showPaymentForm}
          toggleLoading={() => setIsLoading((prev) => !prev)}
          usageBasedEntitlements={usageBasedEntitlements}
        />
      </Flex>
    </Modal>
  );
};
