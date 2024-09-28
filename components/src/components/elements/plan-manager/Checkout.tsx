import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { useTheme } from "styled-components";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import type {
  CompanyPlanDetailResponseData,
  SetupIntentResponseData,
} from "../../../api";
import { TEXT_BASE_SIZE } from "../../../const";
import { useEmbed } from "../../../hooks";
import { hexToHSL } from "../../../utils";
import { Box, Flex, Icon, IconRound, Modal, ModalHeader, Text } from "../../ui";
import { CheckoutContent } from "./CheckoutContent";
import { CheckoutSidebar } from "./CheckoutSidebar";

export const Checkout = () => {
  const theme = useTheme();
  const { api, data } = useEmbed();

  const [checkoutStage, setCheckoutStage] = useState<"plan" | "checkout">(
    "plan",
  );
  const [planPeriod, setPlanPeriod] = useState<string>(
    () => data.company?.plan?.planPeriod || "month",
  );
  const [selectedPlan, setSelectedPlan] =
    useState<CompanyPlanDetailResponseData>();
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
    () => typeof data.subscription?.paymentMethod === "undefined",
  );
  const [stripe, setStripe] = useState<Promise<Stripe | null> | null>(null);
  const [setupIntent, setSetupIntent] = useState<SetupIntentResponseData>();

  const { paymentMethod, currentPlan, availablePlans, planPeriodOptions } =
    useMemo(() => {
      const showMonthlyPriceOption = data.activePlans.some(
        (plan) => typeof plan.yearlyPrice !== "undefined",
      );
      const showYearlyPriceOption = data.activePlans.some(
        (plan) => typeof plan.yearlyPrice !== "undefined",
      );
      const planPeriodOptions = [];
      if (showMonthlyPriceOption) {
        planPeriodOptions.push("month");
      }
      if (showYearlyPriceOption) {
        planPeriodOptions.push("year");
      }

      return {
        paymentMethod: data.subscription?.paymentMethod,
        currentPlan: data.company?.plan,
        availablePlans: data.activePlans,
        planPeriodOptions,
      };
    }, [data.subscription?.paymentMethod, data.company, data.activePlans]);

  const isLightBackground = useMemo(() => {
    return hexToHSL(theme.card.background).l > 50;
  }, [theme.card.background]);

  const selectPlan = useCallback(
    async (plan: CompanyPlanDetailResponseData, newPeriod?: string) => {
      setSelectedPlan(plan);
      setCharges(undefined);

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
    [api, planPeriod],
  );

  useEffect(() => {
    if (!stripe && setupIntent?.publishableKey) {
      setStripe(loadStripe(setupIntent.publishableKey));
    }
  }, [stripe, setupIntent?.publishableKey]);

  useLayoutEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <Modal size="lg">
      <ModalHeader bordered>
        <Flex $gap="1rem">
          <Flex $gap="0.5rem" $alignItems="center">
            {checkoutStage === "plan" ? (
              <Box
                $width={`${20 / TEXT_BASE_SIZE}rem`}
                $height={`${20 / TEXT_BASE_SIZE}rem`}
                $borderWidth="2px"
                $borderStyle="solid"
                $borderColor={
                  isLightBackground
                    ? "hsla(0, 0%, 0%, 0.125)"
                    : "hsla(0, 0%, 100%, 0.25)"
                }
                $borderRadius="9999px"
              />
            ) : (
              <IconRound
                name="check"
                colors={[
                  theme.card.background,
                  isLightBackground
                    ? "hsla(0, 0%, 0%, 0.125)"
                    : "hsla(0, 0%, 100%, 0.25)",
                ]}
                style={{
                  fontSize: `${16 / TEXT_BASE_SIZE}rem`,
                  width: `${20 / TEXT_BASE_SIZE}rem`,
                  height: `${20 / TEXT_BASE_SIZE}rem`,
                }}
              />
            )}

            <Box
              tabIndex={0}
              {...(checkoutStage !== "plan" && {
                onClick: () => setCheckoutStage("plan"),
                $opacity: "0.6375",
                $cursor: "pointer",
              })}
            >
              <Text
                $font={theme.typography.text.fontFamily}
                $size={19}
                $weight={checkoutStage === "plan" ? 600 : 400}
                $color={theme.typography.text.color}
              >
                1. Select plan
              </Text>
            </Box>
          </Flex>

          <Icon
            name="chevron-right"
            style={{
              fontSize: 16,
              color: isLightBackground
                ? "hsla(0, 0%, 0%, 0.175)"
                : "hsla(0, 0%, 100%, 0.35)",
            }}
          />

          <Flex $gap="0.5rem" $alignItems="center">
            <Box
              $width={`${20 / TEXT_BASE_SIZE}rem`}
              $height={`${20 / TEXT_BASE_SIZE}rem`}
              $borderWidth="2px"
              $borderStyle="solid"
              $borderColor={
                isLightBackground
                  ? "hsla(0, 0%, 0%, 0.125)"
                  : "hsla(0, 0%, 100%, 0.25)"
              }
              $borderRadius="9999px"
            />

            <Box
              tabIndex={0}
              {...(checkoutStage !== "checkout" && {
                $opacity: "0.6375",
              })}
            >
              <Text
                $font={theme.typography.text.fontFamily}
                $size={19}
                $weight={checkoutStage === "plan" ? 600 : 400}
                $color={theme.typography.text.color}
              >
                2. Checkout
              </Text>
            </Box>
          </Flex>
        </Flex>
      </ModalHeader>

      <Flex $position="relative" $height="calc(100% - 5rem)">
        <CheckoutContent
          availablePlans={availablePlans}
          checkoutStage={checkoutStage}
          currentPlan={currentPlan}
          isLoading={isLoading}
          planPeriod={planPeriod}
          selectedPlan={selectedPlan}
          selectPlan={selectPlan}
          setPaymentMethodId={setPaymentMethodId}
          setShowPaymentForm={setShowPaymentForm}
          setupIntent={setupIntent}
          showPaymentForm={showPaymentForm}
          stripe={stripe}
        />

        <CheckoutSidebar
          charges={charges}
          checkoutStage={checkoutStage}
          currentPlan={currentPlan}
          error={error}
          isLoading={isLoading}
          paymentMethod={paymentMethod}
          paymentMethodId={paymentMethodId}
          planPeriod={planPeriod}
          planPeriodOptions={planPeriodOptions}
          selectedPlan={selectedPlan}
          selectPlan={selectPlan}
          setCheckoutStage={setCheckoutStage}
          setError={setError}
          setIsLoading={setIsLoading}
          setPlanPeriod={setPlanPeriod}
          setSetupIntent={setSetupIntent}
          showPaymentForm={showPaymentForm}
        />
      </Flex>
    </Modal>
  );
};
