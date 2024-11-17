import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import type {
  CompanyPlanDetailResponseData,
  SetupIntentResponseData,
  UpdateAddOnRequestBody,
} from "../../../api";
import {
  useAvailablePlans,
  useEmbed,
  useIsLightBackground,
} from "../../../hooks";
import { Flex, Modal, ModalHeader } from "../../ui";
import { Navigation } from "./Navigation";
import { Sidebar } from "./Sidebar";
import { Plan } from "./Plan";
import { AddOns } from "./AddOns";
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
  const { api, data } = useEmbed();

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

  const { plans: availablePlans, addOns: availableAddOns } =
    useAvailablePlans(planPeriod);

  // memoize data here since some state depends on it
  const checkoutStages = useMemo(() => {
    const checkoutStages = [
      {
        id: "plan",
        name: "Select plan",
        description: "Choose your base plan",
      },
      {
        id: "addons",
        name: "Addons",
        description: "Optionally add features to your subscription",
      },
      { id: "checkout", name: "Checkout", description: "" },
    ];

    if (!availableAddOns.length) {
      checkoutStages.splice(1, 1);
    }

    return checkoutStages;
  }, [availableAddOns]);

  const currentPlan = data.company?.plan;
  const [selectedPlan, setSelectedPlan] = useState<
    CompanyPlanDetailResponseData | undefined
  >(() =>
    availablePlans.find(
      (plan) =>
        plan.id ===
        (typeof initialPlanId !== "undefined"
          ? initialPlanId
          : currentPlan?.id),
    ),
  );

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

  useLayoutEffect(() => {
    const parent = portal || document.body;
    const value = Math.abs(parent.getBoundingClientRect().top ?? 0);
    setTop(value);

    parent.style.overflow = "hidden";

    return () => {
      parent.style.overflow = "";
    };
  }, [portal]);

  return (
    <Modal size="lg" top={top}>
      <ModalHeader bordered>
        <Flex
          $gap="1rem"
          $viewport={{
            sm: {
              $gap: "0.16rem",
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
        $height="calc(100% - 5rem)"
        $viewport={{
          sm: {
            $height: "auto",
            $flexDirection: "column",
          },
        }}
      >
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
          $viewport={{
            sm: {
              $padding: "1.5rem",
              $height: "auto",
              $flexDirection: "column",
            },
          }}
        >
          {checkoutStage === "plan" && (
            <Plan
              isLoading={isLoading}
              period={planPeriod}
              plans={availablePlans}
              currentPlan={currentPlan}
              selectedPlan={selectedPlan}
              selectPlan={selectPlan}
              setPlanPeriod={setPlanPeriod}
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
          setCheckoutStage={(stage) => setCheckoutStage(stage)}
          setError={(msg) => setError(msg)}
          setSetupIntent={(intent) => setSetupIntent(intent)}
          showPaymentForm={showPaymentForm}
          toggleLoading={() => setIsLoading((prev) => !prev)}
        />
      </Flex>
    </Modal>
  );
};
