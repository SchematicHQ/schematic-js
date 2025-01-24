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
import {
  ResponseError,
  type CompanyPlanDetailResponseData,
  type PlanEntitlementResponseData,
  type UpdateAddOnRequestBody,
  type UpdatePayInAdvanceRequestBody,
  type UsageBasedEntitlementResponseData,
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

export interface CheckoutStage {
  id: string;
  name: string;
  label?: string;
  description?: string;
}

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

  const {
    plans: availablePlans,
    addOns: availableAddOns,
    periods: availablePeriods,
  } = useAvailablePlans(planPeriod);

  const [selectedPlan, setSelectedPlan] = useState(() =>
    availablePlans.find((plan) => plan.current),
  );

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
          const allocation = featureUsage?.allocation ?? 0;
          const usage = featureUsage?.usage ?? 0;
          acc.push({
            entitlement,
            allocation,
            quantity: allocation,
            usage,
          });
        }

        return acc;
      },
    [planPeriod, data.featureUsage?.features],
  );

  const [usageBasedEntitlements, setUsageBasedEntitlements] = useState(() =>
    (selectedPlan?.entitlements || []).reduce(
      createActiveUsageBasedEntitlementsReducer(),
      [],
    ),
  );

  const currentPlan = useMemo(
    () =>
      availablePlans.find(
        (plan) =>
          plan.id === data.company?.plan?.id &&
          data.company?.plan.planPeriod === planPeriod,
      ),
    [data.company?.plan, planPeriod, availablePlans],
  );

  const payInAdvanceEntitlements = useMemo(
    () =>
      usageBasedEntitlements.filter(
        ({ entitlement }) => entitlement.priceBehavior === "pay_in_advance",
      ),
    [usageBasedEntitlements],
  );

  const hasActiveAddOns = addOns.some((addOn) => addOn.isSelected === true);
  const hasActivePayInAdvanceEntitlements = payInAdvanceEntitlements.some(
    ({ quantity }) => quantity > 0,
  );
  const requiresPayment =
    (!selectedPlan?.companyCanTrial || !!data.trialPaymentMethodRequired) &&
    (!selectedPlan?.isFree ||
      hasActiveAddOns ||
      hasActivePayInAdvanceEntitlements);

  const checkoutStages = useMemo(() => {
    const stages: CheckoutStage[] = [
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
    payInAdvanceEntitlements,
    availableAddOns,
    selectedPlan?.companyCanTrial,
    requiresPayment,
  ]);

  const isLightBackground = useIsLightBackground();

  const selectPlan = useCallback(
    (
      updatedPlan: CompanyPlanDetailResponseData & { isSelected: boolean },
      updatedPeriod?: string,
    ) => {
      const entitlements = updatedPlan.entitlements.reduce(
        createActiveUsageBasedEntitlementsReducer(updatedPeriod),
        [],
      );
      setSelectedPlan(updatedPlan);
      setUsageBasedEntitlements(entitlements);
    },
    [createActiveUsageBasedEntitlementsReducer],
  );

  const toggleAddOn = (id: string) => {
    setAddOns((prev) =>
      prev.map((addOn) => ({
        ...addOn,
        ...(addOn.id === id && { isSelected: !addOn.isSelected }),
      })),
    );
  };

  const changePlanPeriod = useCallback(
    (period: string) => {
      if (selectedPlan) {
        selectPlan(selectedPlan, period);
      }

      setPlanPeriod(period);
    },
    [selectedPlan, selectPlan, setPlanPeriod],
  );

  const updateUsageBasedEntitlementQuantity = (
    id: string,
    updatedQuantity: number,
  ) => {
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
  };

  useEffect(() => {
    async function previewCheckout() {
      const planPriceId =
        planPeriod === "month"
          ? selectedPlan?.monthlyPrice?.id
          : selectedPlan?.yearlyPrice?.id;
      if (!api || !selectedPlan || !planPriceId) {
        return;
      }

      setError(undefined);
      setCharges(undefined);
      setIsLoading(true);

      try {
        const { data } = await api.previewCheckout({
          changeSubscriptionRequestBody: {
            newPlanId: selectedPlan.id,
            newPriceId: planPriceId,
            addOnIds: addOns.reduce((acc: UpdateAddOnRequestBody[], addOn) => {
              if (addOn.isSelected) {
                const addOnPriceId = (
                  planPeriod === "month"
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
            payInAdvance: payInAdvanceEntitlements.reduce(
              (
                acc: UpdatePayInAdvanceRequestBody[],
                { entitlement, quantity },
              ) => {
                const priceId = (
                  planPeriod === "month"
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
            ),
          },
        });

        setCharges(data);
      } catch (error) {
        if (error instanceof ResponseError && error.response.status === 401) {
          const data = await error.response.json();
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
    }

    previewCheckout();
  }, [t, api, planPeriod, selectedPlan, addOns, payInAdvanceEntitlements]);

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
              requiresPayment={requiresPayment}
              showPaymentForm={showPaymentForm}
              setPaymentMethodId={(id) => setPaymentMethodId(id)}
              togglePaymentForm={() => setShowPaymentForm((prev) => !prev)}
            />
          )}
        </Flex>

        <Sidebar
          addOns={addOns}
          charges={charges}
          checkoutRef={checkoutRef}
          checkoutStage={checkoutStage}
          checkoutStages={checkoutStages}
          currentAddOns={currentAddOns}
          currentUsageBasedEntitlements={currentUsageBasedEntitlements}
          error={error}
          currentPlan={currentPlan}
          isLoading={isLoading}
          paymentMethodId={paymentMethodId}
          planPeriod={planPeriod}
          requiresPayment={requiresPayment}
          selectedPlan={selectedPlan}
          setCheckoutStage={(stage) => setCheckoutStage(stage)}
          setError={(msg) => setError(msg)}
          showPaymentForm={showPaymentForm}
          toggleLoading={() => setIsLoading((prev) => !prev)}
          usageBasedEntitlements={usageBasedEntitlements}
        />
      </Flex>
    </Modal>
  );
};
