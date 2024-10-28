import { useCallback, useEffect, useMemo, useState } from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import type {
  CompanyPlanDetailResponseData,
  SetupIntentResponseData,
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
        availableAddOns: (mode === "edit"
          ? data.activeAddOns
          : data.activeAddOns.filter((addOn) => {
              return (
                (planPeriod === "month" && addOn.monthlyPrice) ||
                (planPeriod === "year" && addOn.yearlyPrice)
              );
            })
        ).concat(
          {
            companyCount: 1,
            createdAt: new Date(),
            current: true,
            description: "Use radar to track recent activity.",
            entitlements: [],
            features: [],
            icon: "",
            id: "1",
            isDefault: false,
            monthlyPrice: {
              currency: "usd",
              id: "1",
              externalPriceId: "1",
              interval: "monthly",
              price: 5000,
            },
            name: "Radar",
            planType: "",
            updatedAt: new Date(),
            valid: true,
            yearlyPrice: {
              currency: "usd",
              id: "1",
              externalPriceId: "1",
              interval: "yearly",
              price: 1000,
            },
          },
          {
            companyCount: 1,
            createdAt: new Date(),
            current: false,
            description: "Echolocation for your codebase.",
            entitlements: [],
            features: [],
            icon: "",
            id: "2",
            isDefault: false,
            monthlyPrice: {
              currency: "usd",
              id: "1",
              externalPriceId: "1",
              interval: "monthly",
              price: 500,
            },
            name: "Sonar",
            planType: "",
            updatedAt: new Date(),
            valid: true,
            yearlyPrice: {
              currency: "usd",
              id: "1",
              externalPriceId: "1",
              interval: "yearly",
              price: 5000,
            },
          },
        ),
      };
    }, [data.company, data.activePlans, data.activeAddOns, mode, planPeriod]);

  // instantiation for state that depends on memoized data
  const [selectedPlan, setSelectedPlan] = useState(() =>
    availablePlans.find((plan) => plan.id === currentPlan?.id),
  );
  const [addOns, setAddOns] = useState(() =>
    availableAddOns.map((addOn) => ({
      ...addOn,
      isSelected:
        addOn.current ||
        currentAddOns.some((currentAddOn) => addOn.id === currentAddOn.id),
    })),
  );

  const isLightBackground = useIsLightBackground();

  const selectPlan = useCallback(
    async (plan: CompanyPlanDetailResponseData, newPeriod?: string) => {
      setCharges(undefined);
      if (
        plan.id === currentPlan?.id &&
        newPeriod &&
        newPeriod === currentPlan?.planPeriod
      ) {
        return;
      }

      setSelectedPlan(plan);

      const period = newPeriod || planPeriod;
      const priceId = (
        period === "month" ? plan?.monthlyPrice : plan?.yearlyPrice
      )?.id;
      if (!priceId || !api) {
        return;
      }

      try {
        setIsLoading(true);
        const { data } = await api.previewCheckout({
          changeSubscriptionRequestBody: {
            newPlanId: plan.id,
            newPriceId: priceId,
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
    [api, currentPlan, planPeriod],
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
              select={(id) =>
                setAddOns((prev) =>
                  prev.map((addOn) => ({
                    ...addOn,
                    ...(addOn.id === id && { isSelected: true }),
                  })),
                )
              }
              deselect={(id) =>
                setAddOns((prev) =>
                  prev.map((addOn) => ({
                    ...addOn,
                    ...(addOn.id === id && { isSelected: false }),
                  })),
                )
              }
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
