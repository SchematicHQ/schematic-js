import { useCallback, useEffect, useMemo, useState } from "react";
import { useTheme } from "styled-components";
import pluralize from "pluralize";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import type {
  CompanyPlanDetailResponseData,
  PlanEntitlementResponseData,
  SetupIntentResponseData,
} from "../../../api";
import { TEXT_BASE_SIZE } from "../../../const";
import { useEmbed, useIsLightBackground } from "../../../hooks";
import {
  hexToHSL,
  formatCurrency,
  formatNumber,
  formatOrdinal,
  getMonthName,
} from "../../../utils";
import { PaymentForm, PaymentMethod } from "../../elements";
import {
  Box,
  EmbedButton,
  Flex,
  Icon,
  IconRound,
  Modal,
  ModalHeader,
  Text,
  Tooltip,
  type IconNameTypes,
} from "../../ui";

const FeatureName = ({
  entitlement,
}: {
  entitlement: PlanEntitlementResponseData;
}) => {
  const theme = useTheme();

  if (!entitlement.feature?.name) {
    return null;
  }

  if (
    entitlement.valueType === "numeric" ||
    entitlement.valueType === "unlimited" ||
    entitlement.valueType === "trait"
  ) {
    let period;
    if (entitlement.metricPeriod) {
      period = {
        billing: "billing period",
        current_day: "day",
        current_month: "month",
        current_year: "year",
      }[entitlement.metricPeriod];
    }

    return (
      <Flex $alignItems="center">
        <Text
          $font={theme.typography.text.fontFamily}
          $size={theme.typography.text.fontSize}
          $weight={theme.typography.text.fontWeight}
          $color={theme.typography.text.color}
        >
          {typeof entitlement.valueNumeric === "number"
            ? `${formatNumber(entitlement.valueNumeric)} ${pluralize(entitlement.feature.name, entitlement.valueNumeric)}`
            : `Unlimited ${pluralize(entitlement.feature.name)}`}
          {period && ` per ${period}`}
        </Text>
      </Flex>
    );
  }

  return (
    <Flex $alignItems="center">
      <Text
        $font={theme.typography.text.fontFamily}
        $size={theme.typography.text.fontSize}
        $weight={theme.typography.text.fontWeight}
        $color={theme.typography.text.color}
      >
        {entitlement.feature.name}
      </Text>
    </Flex>
  );
};

export const CheckoutDialog = () => {
  const theme = useTheme();
  const { api, data, mode, setLayout } = useEmbed();

  const [checkoutStage, setCheckoutStage] = useState<"plan" | "checkout">(
    "plan",
  );
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
    () => typeof data.subscription?.paymentMethod === "undefined",
  );
  const [stripe, setStripe] = useState<Promise<Stripe | null> | null>(null);
  const [setupIntent, setSetupIntent] = useState<SetupIntentResponseData>();

  const { paymentMethod, currentPlan, availablePlans, planPeriodOptions } =
    useMemo(() => {
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
      };
    }, [
      data.subscription?.paymentMethod,
      data.company,
      data.activePlans,
      mode,
      planPeriod,
    ]);

  const [selectedPlan, setSelectedPlan] = useState<
    CompanyPlanDetailResponseData | undefined
  >(() => availablePlans.find((plan) => plan.id === currentPlan?.id));

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

  useEffect(() => {
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const canUpdateSubscription =
    api &&
    selectedPlan &&
    (selectedPlan.id !== currentPlan?.id ||
      planPeriod !== currentPlan.planPeriod) &&
    !isLoading;

  const canCheckout =
    canUpdateSubscription &&
    ((paymentMethod && !showPaymentForm) || paymentMethodId);

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
            <>
              <Flex $flexDirection="column" $gap="1rem" $marginBottom="1rem">
                <Text
                  as="h3"
                  id="select-plan-dialog-label"
                  $font={theme.typography.heading3.fontFamily}
                  $size={theme.typography.heading3.fontSize}
                  $weight={theme.typography.heading3.fontWeight}
                  $color={theme.typography.heading3.color}
                  $marginBottom="0.5rem"
                >
                  Select plan
                </Text>

                <Text
                  as="p"
                  id="select-plan-dialog-description"
                  $font={theme.typography.text.fontFamily}
                  $size={theme.typography.text.fontSize}
                  $weight={theme.typography.text.fontWeight}
                  $color={theme.typography.text.color}
                >
                  Choose your base plan
                </Text>
              </Flex>

              <Flex $flexWrap="wrap" $gap="1rem" $flexGrow="1">
                {availablePlans
                  .sort((a, b) => {
                    if (planPeriod === "year") {
                      return (
                        (a.yearlyPrice?.price ?? 0) -
                        (b.yearlyPrice?.price ?? 0)
                      );
                    }

                    if (planPeriod === "month") {
                      return (
                        (a.monthlyPrice?.price ?? 0) -
                        (b.monthlyPrice?.price ?? 0)
                      );
                    }

                    return 0;
                  })
                  .map((plan) => {
                    const isCurrentPlan = plan.id === selectedPlan?.id;

                    return (
                      <Flex
                        key={plan.id}
                        $flexDirection="column"
                        $width="100%"
                        $minWidth="280px"
                        $maxWidth={`calc(${100 / 3}% - 1rem)`}
                        $backgroundColor={theme.card.background}
                        $outlineWidth="2px"
                        $outlineStyle="solid"
                        $outlineColor={
                          plan.id === selectedPlan?.id
                            ? theme.primary
                            : "transparent"
                        }
                        $borderRadius={`${theme.card.borderRadius / TEXT_BASE_SIZE}rem`}
                        {...(theme.card.hasShadow && {
                          $boxShadow:
                            "0px 1px 3px rgba(16, 24, 40, 0.1), 0px 1px 20px rgba(16, 24, 40, 0.06)",
                        })}
                      >
                        <Flex
                          $flexDirection="column"
                          $position="relative"
                          $gap="1rem"
                          $width="100%"
                          $height="auto"
                          $padding={`${theme.card.padding / TEXT_BASE_SIZE}rem`}
                          $borderBottomWidth="1px"
                          $borderStyle="solid"
                          $borderColor={
                            isLightBackground
                              ? "hsla(0, 0%, 0%, 0.175)"
                              : "hsla(0, 0%, 100%, 0.175)"
                          }
                        >
                          <Text $size={20} $weight={600}>
                            {plan.name}
                          </Text>

                          <Text $size={14}>{plan.description}</Text>

                          <Text>
                            <Box $display="inline-block" $fontSize="1.5rem">
                              {formatCurrency(
                                (planPeriod === "month"
                                  ? plan.monthlyPrice
                                  : plan.yearlyPrice
                                )?.price ?? 0,
                              )}
                            </Box>

                            <Box $display="inline-block" $fontSize="0.75rem">
                              /{planPeriod}
                            </Box>
                          </Text>

                          {isCurrentPlan && (
                            <Flex
                              $position="absolute"
                              $right="1rem"
                              $top="1rem"
                              $fontSize="0.625rem"
                              $color={
                                hexToHSL(theme.primary).l > 50
                                  ? "#000000"
                                  : "#FFFFFF"
                              }
                              $backgroundColor={theme.primary}
                              $borderRadius="9999px"
                              $padding="0.125rem 0.85rem"
                            >
                              Current plan
                            </Flex>
                          )}
                        </Flex>

                        <Flex
                          $flexDirection="column"
                          $position="relative"
                          $gap="0.5rem"
                          $flex="1"
                          $width="100%"
                          $height="auto"
                          $padding="1.5rem"
                        >
                          {plan.entitlements.map((entitlement) => {
                            return (
                              <Flex
                                key={entitlement.id}
                                $flexWrap="wrap"
                                $justifyContent="space-between"
                                $alignItems="center"
                                $gap="1rem"
                              >
                                <Flex $gap="1rem">
                                  {entitlement.feature?.icon && (
                                    <IconRound
                                      name={
                                        entitlement.feature
                                          .icon as IconNameTypes
                                      }
                                      size="sm"
                                      colors={[
                                        theme.primary,
                                        isLightBackground
                                          ? "hsla(0, 0%, 0%, 0.0625)"
                                          : "hsla(0, 0%, 100%, 0.25)",
                                      ]}
                                    />
                                  )}

                                  <FeatureName entitlement={entitlement} />
                                </Flex>
                              </Flex>
                            );
                          })}
                        </Flex>

                        <Flex
                          $flexDirection="column"
                          $position="relative"
                          $gap="1rem"
                          $width="100%"
                          $height="auto"
                          $padding="1.5rem"
                        >
                          {!isCurrentPlan ? (
                            <Box $position="relative">
                              <EmbedButton
                                disabled={isLoading || plan.valid === false}
                                isLoading={isLoading}
                                {...(plan.valid === true && {
                                  onClick: () => selectPlan(plan),
                                })}
                                $size="sm"
                                $color="primary"
                                $variant="outline"
                              >
                                {plan.valid === false ? (
                                  <Tooltip
                                    label="Over usage limit"
                                    description=" Current usage exceeds limit of this plan"
                                  />
                                ) : (
                                  "Select"
                                )}
                              </EmbedButton>
                            </Box>
                          ) : (
                            <Flex
                              $justifyContent="center"
                              $alignItems="center"
                              $gap="0.25rem"
                              $fontSize="0.9375rem"
                              $padding="0.625rem 0"
                            >
                              <Icon
                                name="check-rounded"
                                style={{
                                  fontSize: 20,
                                  lineHeight: "1",
                                  color: theme.primary,
                                }}
                              />

                              <Text
                                $lineHeight="1.4"
                                $color={theme.typography.text.color}
                              >
                                Selected
                              </Text>
                            </Flex>
                          )}
                        </Flex>
                      </Flex>
                    );
                  })}
              </Flex>
            </>
          )}

          {selectedPlan && checkoutStage === "checkout" && (
            <>
              {showPaymentForm && setupIntent?.setupIntentClientSecret ? (
                <Elements
                  stripe={stripe}
                  options={{
                    appearance: {
                      theme: "stripe",
                      variables: {
                        // Base
                        fontFamily: '"Public Sans", system-ui, sans-serif',
                        spacingUnit: "0.25rem",
                        borderRadius: "0.5rem",
                        colorText: "#30313D",
                        colorBackground: "#FFFFFF",
                        colorPrimary: "#0570DE",
                        colorDanger: "#DF1B41",

                        // Layout
                        gridRowSpacing: "1.5rem",
                        gridColumnSpacing: "1.5rem",
                      },
                      rules: {
                        ".Label": {
                          fontSize: "1rem",
                          fontWeight: "400",
                          marginBottom: "0.75rem",
                          color: theme.typography.text.color,
                        },
                      },
                    },
                    clientSecret: setupIntent.setupIntentClientSecret,
                  }}
                >
                  <Box $width="100%" $marginBottom="1.5rem">
                    <Text $size={18}>Add payment method</Text>
                  </Box>

                  <PaymentForm
                    plan={selectedPlan}
                    period={planPeriod}
                    onConfirm={(value) => {
                      setPaymentMethodId(value);
                    }}
                  />

                  {data.subscription?.paymentMethod && (
                    <Box>
                      <Text
                        onClick={() => setShowPaymentForm(false)}
                        $font={theme.typography.link.fontFamily}
                        $size={theme.typography.link.fontSize}
                        $weight={theme.typography.link.fontWeight}
                        $color={theme.typography.link.color}
                      >
                        Use existing payment method
                      </Text>
                    </Box>
                  )}
                </Elements>
              ) : (
                <>
                  <PaymentMethod />

                  <Box>
                    <Text
                      onClick={() => setShowPaymentForm(true)}
                      $font={theme.typography.link.fontFamily}
                      $size={theme.typography.link.fontSize}
                      $weight={theme.typography.link.fontWeight}
                      $color={theme.typography.link.color}
                    >
                      Change payment method
                    </Text>
                  </Box>
                </>
              )}
            </>
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
            $height="auto"
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
            $height="auto"
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
                    {...(canCheckout && {
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

              {canCheckout && (
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
            $height="auto"
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

            {checkoutStage === "plan" ? (
              <EmbedButton
                isLoading={isLoading}
                {...(canUpdateSubscription
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
            ) : (
              <EmbedButton
                disabled={isLoading || !canCheckout}
                isLoading={isLoading}
                {...(canCheckout && { onClick: checkout })}
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
