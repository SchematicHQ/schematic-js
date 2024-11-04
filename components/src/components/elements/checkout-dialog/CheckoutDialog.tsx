import { useCallback, useEffect, useMemo, useState } from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import type {
  CompanyPlanDetailResponseData,
  SetupIntentResponseData,
  UpdateAddOnRequestBody,
} from "../../../api";
import { useEmbed, useIsLightBackground } from "../../../hooks";
import { Flex, Modal, ModalHeader } from "../../ui";
import { Navigation } from "./Navigation";
import { Sidebar } from "./Sidebar";
import { Plan } from "./Plan";
import { AddOns } from "./AddOns";
import { Checkout } from "./Checkout";

const checkoutStages = [
  { id: "plan", name: "Select plan", description: "Choose your base plan" },
  {
    id: "addons",
    name: "Customize with addons",
    description: "Optionally add features to your subscription",
  },
  { id: "checkout", name: "Checkout", description: "" },
];

export const CheckoutDialog = () => {
  const { api, data, mode } = useEmbed();

  const [checkoutStage, setCheckoutStage] = useState("plan");
  const [planPeriod, setPlanPeriod] = useState(
    data.company?.plan?.planPeriod || "month",
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

  // memoize data here since some state depends on it
  const { currentPlan, currentAddOns, availablePlans, availableAddOns } =
    useMemo(() => {
      const planPeriodOptions = [];
      if (data.activePlans.some((plan) => plan.monthlyPrice)) {
        planPeriodOptions.push("month");
      }
      if (data.activePlans.some((plan) => plan.yearlyPrice)) {
        planPeriodOptions.push("year");
      }

      return {
        currentPlan: data.company?.plan,
        currentAddOns: data.company?.addOns || [],
        availablePlans:
          mode === "edit"
            ? data.activePlans
            : data.activePlans.filter((plan) => {
                return (
                  (planPeriod === "month" && plan.monthlyPrice) ||
                  (planPeriod === "year" && plan.yearlyPrice)
                );
              }),
        availableAddOns:
          mode === "edit"
            ? data.activeAddOns
            : data.activeAddOns.filter((addOn) => {
                return (
                  (planPeriod === "month" && addOn.monthlyPrice) ||
                  (planPeriod === "year" && addOn.yearlyPrice)
                );
              }),
      };
    }, [data.company, data.activePlans, data.activeAddOns, mode, planPeriod]);

  // instantiation for state that depends on memoized data
  const [selectedPlan, setSelectedPlan] = useState(() =>
    availablePlans.find((plan) => plan.id === currentPlan?.id),
  );
  const [addOns, setAddOns] = useState(() =>
    availableAddOns.map((addOn) => ({
      ...addOn,
      isSelected: currentAddOns.some(
        (currentAddOn) => addOn.id === currentAddOn.id,
      ),
    })),
  );

  const isLightBackground = useIsLightBackground();

  const previewCheckout = useCallback(
    async (
      plan: CompanyPlanDetailResponseData,
      addOns: (CompanyPlanDetailResponseData & { isSelected: boolean })[],
      period: string,
    ) => {
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
          "Error retrieving plan details. Please try again in a moment.",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [api],
  );

  const selectPlan = useCallback(
    (plan: CompanyPlanDetailResponseData, newPeriod?: string) => {
      setSelectedPlan(plan);
      previewCheckout(plan, addOns, newPeriod || planPeriod);
    },
    [addOns, planPeriod, previewCheckout],
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

  useEffect(() => {
    if (!stripe && setupIntent?.publishableKey) {
      setStripe(loadStripe(setupIntent.publishableKey));
    }
  }, [stripe, setupIntent?.publishableKey]);

  // prevent scrolling when the checkout dialog is open
  useEffect(() => {
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <Modal size="lg">
      <ModalHeader bordered>
        <Flex $gap="1rem">
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

      <Flex $position="relative" $height="calc(100% - 5rem)">
        <Flex
          $flexDirection="column"
          $flexGrow="1"
          $gap="1rem"
          $padding="2rem 2.5rem 2rem 2.5rem"
          $backgroundColor={
            isLightBackground
              ? "hsla(0, 0%, 0%, 0.025)"
              : "hsla(0, 0%, 100%, 0.025)"
          }
          $flex="1"
          $overflow="auto"
        >
          {checkoutStage === "plan" && (
            <Plan
              isLoading={isLoading}
              period={planPeriod}
              plans={availablePlans}
              selectedPlan={selectedPlan}
              selectPlan={selectPlan}
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
          checkoutStage={checkoutStage}
          currentAddOns={currentAddOns}
          currentPlan={currentPlan}
          error={error}
          isLoading={isLoading}
          paymentMethodId={paymentMethodId}
          planPeriod={planPeriod}
          selectedPlan={selectedPlan}
          selectPlan={selectPlan}
          setCheckoutStage={(stage) => setCheckoutStage(stage)}
          setError={(msg) => setError(msg)}
          setPlanPeriod={(period) => setPlanPeriod(period)}
          setSetupIntent={(intent) => setSetupIntent(intent)}
          showPaymentForm={showPaymentForm}
          toggleLoading={() => setIsLoading((prev) => !prev)}
        />
      </Flex>
    </Modal>
  );
};
