import { useCallback, useEffect, useMemo, useState } from "react";
import { useTheme } from "styled-components";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import type {
  CompanyPlanDetailResponseData,
  SetupIntentResponseData,
} from "../../../api";
import { useEmbed, useIsLightBackground } from "../../../hooks";
import { formatCurrency, formatOrdinal, getMonthName } from "../../../utils";
import {
  Box,
  EmbedButton,
  Flex,
  Icon,
  Modal,
  ModalHeader,
  Text,
} from "../../ui";
import { Navigation } from "./Navigation";
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
  const theme = useTheme();

  const { api, data, mode, setLayout } = useEmbed();

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
  const {
    paymentMethod,
    currentPlan,
    availablePlans,
    planPeriodOptions,
    addOns,
  } = useMemo(() => {
    const planPeriodOptions = [];
    if (data.activePlans.some((plan) => plan.monthlyPrice)) {
      planPeriodOptions.push("month");
    }
    if (data.activePlans.some((plan) => plan.yearlyPrice)) {
      planPeriodOptions.push("year");
    }

    return {
      paymentMethod: data.subscription?.paymentMethod,
      currentPlan: data.company?.plan,
      availablePlans:
        mode === "edit"
          ? data.activePlans
          : data.activePlans.filter((plan) => {
              return (
                (planPeriod === "month" && plan.monthlyPrice) ||
                (planPeriod === "year" && plan.yearlyPrice)
              );
            }),
      planPeriodOptions,
      addOns: data.company?.plan ? [data.company?.plan] : [],
    };
  }, [
    data.subscription?.paymentMethod,
    data.company,
    data.activePlans,
    mode,
    planPeriod,
  ]);

  // instantiation for state that depends on memoized data
  const [selectedPlan, setSelectedPlan] = useState(() =>
    availablePlans.find((plan) => plan.id === currentPlan?.id),
  );
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);

  const savingsPercentage = useMemo(() => {
    if (selectedPlan) {
      const monthly = (selectedPlan?.monthlyPrice?.price || 0) * 12;
      const yearly = selectedPlan?.yearlyPrice?.price || 0;
      return Math.round(((monthly - yearly) / monthly) * 10000) / 100;
    }

    return 0;
  }, [selectedPlan]);

  const subscriptionPrice = useMemo(() => {
    if (
      !selectedPlan ||
      !selectedPlan.monthlyPrice ||
      !selectedPlan.yearlyPrice
    ) {
      return;
    }

    return formatCurrency(
      (planPeriod === "month"
        ? selectedPlan.monthlyPrice
        : selectedPlan.yearlyPrice
      )?.price,
    );
  }, [selectedPlan, planPeriod]);

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

  const changePlanPeriod = useCallback(
    (period: string) => {
      if (selectedPlan) {
        selectPlan(selectedPlan, period);
      }

      setPlanPeriod(period);
    },
    [selectedPlan, selectPlan],
  );

  const checkout = useCallback(async () => {
    const priceId = (
      planPeriod === "month"
        ? selectedPlan?.monthlyPrice
        : selectedPlan?.yearlyPrice
    )?.id;
    if (!api || !selectedPlan || !priceId) {
      return;
    }

    try {
      setIsLoading(true);
      await api.checkout({
        changeSubscriptionRequestBody: {
          newPlanId: selectedPlan.id,
          newPriceId: priceId,
          ...(paymentMethodId && { paymentMethodId }),
        },
      });
      setLayout("success");
    } catch {
      setError(
        "Error processing payment. Please try a different payment method.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [api, paymentMethodId, planPeriod, selectedPlan, setLayout]);

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

  const allowAddons =
    api &&
    selectedPlan &&
    (selectedPlan.id !== currentPlan?.id ||
      planPeriod !== currentPlan.planPeriod) &&
    !isLoading;

  const allowCheckout =
    allowAddons && ((paymentMethod && !showPaymentForm) || paymentMethodId);

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
              plans={availablePlans}
              selectedPlan={selectedPlan}
              period={planPeriod}
              selectPlan={selectPlan}
            />
          )}

          {checkoutStage === "addons" && (
            <AddOns
              addOns={addOns}
              selectedAddOns={selectedAddOns}
              setSelectedAddOns={setSelectedAddOns}
              isLoading={isLoading}
            />
          )}

          {checkoutStage === "checkout" && (
            <Checkout
              period={planPeriod}
              plan={selectedPlan}
              setPaymentMethodId={setPaymentMethodId}
              setShowPaymentForm={setShowPaymentForm}
              setupIntent={setupIntent}
              showPaymentForm={showPaymentForm}
              stripe={stripe}
            />
          )}
        </Flex>

        <Flex
          $flexDirection="column"
          $width="21.5rem"
          $overflow="auto"
          $backgroundColor={theme.card.background}
          $borderRadius="0 0 0.5rem"
          $boxShadow="0px 1px 20px 0px #1018280F, 0px 1px 3px 0px #1018281A;"
        >
          <Flex
            $position="relative"
            $flexDirection="column"
            $gap="1rem"
            $width="100%"
            $padding="1.5rem"
            $borderBottomWidth="1px"
            $borderStyle="solid"
            $borderColor={
              isLightBackground
                ? "hsla(0, 0%, 0%, 0.1)"
                : "hsla(0, 0%, 100%, 0.2)"
            }
          >
            <Flex $justifyContent="space-between">
              <Text
                as="h3"
                $font={theme.typography.heading3.fontFamily}
                $size={theme.typography.heading3.fontSize}
                $weight={theme.typography.heading3.fontWeight}
                $color={theme.typography.heading3.color}
              >
                Subscription
              </Text>
            </Flex>

            {planPeriodOptions.length > 1 && (
              <Flex
                $borderWidth="1px"
                $borderStyle="solid"
                $borderColor={
                  isLightBackground
                    ? "hsla(0, 0%, 0%, 0.1)"
                    : "hsla(0, 0%, 100%, 0.2)"
                }
                $borderRadius="2.5rem"
                $cursor="pointer"
              >
                <Flex
                  onClick={() => changePlanPeriod("month")}
                  $justifyContent="center"
                  $alignItems="center"
                  $padding="0.25rem 0.5rem"
                  $flex="1"
                  {...(planPeriod === "month" && {
                    $backgroundColor: isLightBackground
                      ? "hsla(0, 0%, 0%, 0.075)"
                      : "hsla(0, 0%, 100%, 0.15)",
                  })}
                  $borderRadius="2.5rem"
                >
                  <Text
                    $font={theme.typography.text.fontFamily}
                    $size={14}
                    $weight={planPeriod === "month" ? 600 : 400}
                    $color={theme.typography.text.color}
                  >
                    Billed monthly
                  </Text>
                </Flex>

                <Flex
                  onClick={() => changePlanPeriod("year")}
                  $justifyContent="center"
                  $alignItems="center"
                  $padding="0.25rem 0.5rem"
                  $flex="1"
                  {...(planPeriod === "year" && {
                    $backgroundColor: isLightBackground
                      ? "hsla(0, 0%, 0%, 0.075)"
                      : "hsla(0, 0%, 100%, 0.15)",
                  })}
                  $borderRadius="2.5rem"
                >
                  <Text
                    $font={theme.typography.text.fontFamily}
                    $size={14}
                    $weight={planPeriod === "year" ? 600 : 400}
                    $color={theme.typography.text.color}
                  >
                    Billed yearly
                  </Text>
                </Flex>
              </Flex>
            )}

            {savingsPercentage > 0 && (
              <Box>
                <Text
                  $font={theme.typography.text.fontFamily}
                  $size={11}
                  $weight={theme.typography.text.fontWeight}
                  $color={theme.primary}
                >
                  {planPeriod === "month"
                    ? `Save up to ${savingsPercentage}% with yearly billing`
                    : `You are saving ${savingsPercentage}% with yearly billing`}
                </Text>
              </Box>
            )}
          </Flex>

          <Flex
            $flexDirection="column"
            $position="relative"
            $gap="0.5rem"
            $width="100%"
            $padding="1.5rem"
            $flex="1"
            $borderBottomWidth="1px"
            $borderStyle="solid"
            $borderColor={
              isLightBackground
                ? "hsla(0, 0%, 0%, 0.1)"
                : "hsla(0, 0%, 100%, 0.2)"
            }
          >
            <Box $opacity="0.625">
              <Text
                $font={theme.typography.text.fontFamily}
                $size={14}
                $weight={theme.typography.text.fontWeight}
                $color={theme.typography.text.color}
              >
                Plan
              </Text>
            </Box>

            <Flex $flexDirection="column" $gap="0.5rem">
              {currentPlan && (
                <Flex
                  $justifyContent="space-between"
                  $alignItems="center"
                  $gap="1rem"
                >
                  <Flex
                    {...(allowCheckout && {
                      $opacity: "0.625",
                      $textDecoration: "line-through",
                    })}
                  >
                    <Text
                      $font={theme.typography.heading4.fontFamily}
                      $size={theme.typography.heading4.fontSize}
                      $weight={theme.typography.heading4.fontWeight}
                      $color={theme.typography.heading4.color}
                    >
                      {currentPlan.name}
                    </Text>
                  </Flex>

                  {typeof currentPlan.planPrice === "number" &&
                    currentPlan.planPeriod && (
                      <Flex>
                        <Text
                          $font={theme.typography.text.fontFamily}
                          $size={theme.typography.text.fontSize}
                          $weight={theme.typography.text.fontWeight}
                          $color={theme.typography.text.color}
                        >
                          {formatCurrency(currentPlan.planPrice)}/
                          {currentPlan.planPeriod}
                        </Text>
                      </Flex>
                    )}
                </Flex>
              )}

              {allowCheckout && (
                <Box $marginBottom="1rem">
                  <Box
                    $width="100%"
                    $textAlign="left"
                    $opacity="50%"
                    $marginBottom="0.25rem"
                    $marginTop="-0.25rem"
                  >
                    <Icon
                      name="arrow-down"
                      style={{
                        display: "inline-block",
                      }}
                    />
                  </Box>

                  <Flex
                    $justifyContent="space-between"
                    $alignItems="center"
                    $gap="1rem"
                  >
                    <Flex>
                      <Text
                        $font={theme.typography.heading4.fontFamily}
                        $size={theme.typography.heading4.fontSize}
                        $weight={theme.typography.heading4.fontWeight}
                        $color={theme.typography.heading4.color}
                      >
                        {selectedPlan.name}
                      </Text>
                    </Flex>

                    <Flex>
                      <Text
                        $font={theme.typography.text.fontFamily}
                        $size={theme.typography.text.fontSize}
                        $weight={theme.typography.text.fontWeight}
                        $color={theme.typography.text.color}
                      >
                        {formatCurrency(
                          (planPeriod === "month"
                            ? selectedPlan.monthlyPrice
                            : selectedPlan.yearlyPrice
                          )?.price ?? 0,
                        )}
                        /{planPeriod}
                      </Text>
                    </Flex>
                  </Flex>
                </Box>
              )}
            </Flex>

            {charges?.proration && (
              <>
                <Box $opacity="0.625">
                  <Text
                    $font={theme.typography.text.fontFamily}
                    $size={14}
                    $weight={theme.typography.text.fontWeight}
                    $color={theme.typography.text.color}
                  >
                    {charges?.proration && charges.proration > 0
                      ? "Proration"
                      : "Credits"}
                  </Text>
                </Box>

                <Flex $flexDirection="column" $gap="0.5rem">
                  {currentPlan && (
                    <Flex
                      $justifyContent="space-between"
                      $alignItems="center"
                      $gap="1rem"
                    >
                      <Flex>
                        <Text
                          $font={theme.typography.heading4.fontFamily}
                          $size={theme.typography.heading4.fontSize}
                          $weight={theme.typography.heading4.fontWeight}
                          $color={theme.typography.heading4.color}
                        >
                          Unused time with {currentPlan.name}
                        </Text>
                      </Flex>

                      <Flex>
                        <Text
                          $font={theme.typography.text.fontFamily}
                          $size={theme.typography.text.fontSize}
                          $weight={theme.typography.text.fontWeight}
                          $color={theme.typography.text.color}
                        >
                          {formatCurrency(charges.proration)}
                        </Text>
                      </Flex>
                    </Flex>
                  )}
                </Flex>
              </>
            )}
          </Flex>

          <Flex
            $flexDirection="column"
            $position="relative"
            $gap="1rem"
            $width="100%"
            $padding="1.5rem"
          >
            {selectedPlan && subscriptionPrice && (
              <Flex $justifyContent="space-between" $gap="1rem">
                <Box $opacity="0.625">
                  <Text
                    $font={theme.typography.text.fontFamily}
                    $size={theme.typography.text.fontSize}
                    $weight={theme.typography.text.fontWeight}
                    $color={theme.typography.text.color}
                  >
                    {planPeriod === "month" ? "Monthly" : "Yearly"} total:
                  </Text>
                </Box>

                <Box>
                  <Text
                    $font={theme.typography.text.fontFamily}
                    $size={theme.typography.text.fontSize}
                    $weight={theme.typography.text.fontWeight}
                    $color={theme.typography.text.color}
                  >
                    {subscriptionPrice}/{planPeriod}
                  </Text>
                </Box>
              </Flex>
            )}

            {charges && (
              <Flex $justifyContent="space-between" $gap="1rem">
                <Box $opacity="0.625">
                  <Text
                    $font={theme.typography.text.fontFamily}
                    $size={theme.typography.text.fontSize}
                    $weight={theme.typography.text.fontWeight}
                    $color={theme.typography.text.color}
                  >
                    Due today:
                  </Text>
                </Box>

                <Box>
                  <Text
                    $font={theme.typography.text.fontFamily}
                    $size={theme.typography.text.fontSize}
                    $weight={theme.typography.text.fontWeight}
                    $color={theme.typography.text.color}
                  >
                    {formatCurrency(Math.max(0, charges.dueNow))}
                  </Text>
                </Box>
              </Flex>
            )}

            {charges?.dueNow && charges.dueNow < 0 && (
              <Flex $justifyContent="space-between" $gap="1rem">
                <Box $opacity="0.625">
                  <Text
                    $font={theme.typography.text.fontFamily}
                    $size={theme.typography.text.fontSize}
                    $weight={theme.typography.text.fontWeight}
                    $color={theme.typography.text.color}
                  >
                    Credits to be applied to future invoices:
                  </Text>
                </Box>

                <Box>
                  <Text
                    $font={theme.typography.text.fontFamily}
                    $size={theme.typography.text.fontSize}
                    $weight={theme.typography.text.fontWeight}
                    $color={theme.typography.text.color}
                  >
                    {formatCurrency(Math.abs(charges.dueNow))}
                  </Text>
                </Box>
              </Flex>
            )}

            {checkoutStage === "plan" && (
              <EmbedButton
                isLoading={isLoading}
                {...(allowAddons
                  ? {
                      onClick: () => {
                        setCheckoutStage("addons");
                      },
                    }
                  : { disabled: true })}
              >
                <Flex
                  $gap="0.5rem"
                  $justifyContent="center"
                  $alignItems="center"
                  $padding="0 1rem"
                >
                  <Text $align="left" $lineHeight={1}>
                    Next: Addons
                  </Text>
                  <Icon name="arrow-right" />
                </Flex>
              </EmbedButton>
            )}

            {checkoutStage === "addons" && (
              <EmbedButton
                isLoading={isLoading}
                {...(allowCheckout
                  ? {
                      onClick: async () => {
                        if (!data.component?.id) {
                          return;
                        }

                        const { data: setupIntent } = await api.getSetupIntent({
                          componentId: data.component.id,
                        });
                        setSetupIntent(setupIntent);

                        setCheckoutStage("checkout");
                      },
                    }
                  : { disabled: true })}
              >
                <Flex
                  $gap="0.5rem"
                  $justifyContent="center"
                  $alignItems="center"
                  $padding="0 1rem"
                >
                  <Text $align="left" $lineHeight={1}>
                    Next: Checkout
                  </Text>
                  <Icon name="arrow-right" />
                </Flex>
              </EmbedButton>
            )}

            {checkoutStage === "checkout" && (
              <EmbedButton
                disabled={isLoading || !allowCheckout}
                isLoading={isLoading}
                {...(allowCheckout && { onClick: checkout })}
              >
                Pay now
              </EmbedButton>
            )}

            {!isLoading && error && (
              <Box>
                <Text
                  $font={theme.typography.text.fontFamily}
                  $size={theme.typography.text.fontSize}
                  $weight={500}
                  $color="#DB6669"
                >
                  {error}
                </Text>
              </Box>
            )}

            <Box $opacity="0.625">
              <Text
                $font={theme.typography.text.fontFamily}
                $size={theme.typography.text.fontSize}
                $weight={theme.typography.text.fontWeight}
                $color={theme.typography.text.color}
              >
                {subscriptionPrice &&
                  `You will be billed ${subscriptionPrice} for this subscription
                    every ${planPeriod} ${charges?.periodStart ? `on the ${formatOrdinal(charges.periodStart.getDate())}` : ""} ${planPeriod === "year" && charges?.periodStart ? `of ${getMonthName(charges.periodStart)}` : ""} unless you unsubscribe.`}
              </Text>
            </Box>
          </Flex>
        </Flex>
      </Flex>
    </Modal>
  );
};
