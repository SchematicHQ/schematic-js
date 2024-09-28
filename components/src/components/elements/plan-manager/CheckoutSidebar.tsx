import { useCallback, useMemo } from "react";
import { useTheme } from "styled-components";
import type {
  BillingPlan,
  CompanyPlanDetailResponseData,
  PaymentMethodResponseData,
  SetupIntentResponseData,
} from "../../../api";
import { useEmbed } from "../../../hooks";
import {
  hexToHSL,
  formatCurrency,
  formatOrdinal,
  getMonthName,
} from "../../../utils";
import { Box, Flex, Icon, Text } from "../../ui";
import { StyledButton } from "./styles";

interface CheckoutSidebarProps {
  charges?: {
    dueNow: number;
    newCharges: number;
    proration: number;
    periodStart: Date;
  };
  checkoutStage: "plan" | "checkout";
  currentPlan?: BillingPlan;
  error?: string;
  isLoading: boolean;
  paymentMethod?: PaymentMethodResponseData;
  paymentMethodId?: string;
  planPeriod: string;
  planPeriodOptions: string[];
  selectedPlan?: CompanyPlanDetailResponseData;
  selectPlan: (plan: CompanyPlanDetailResponseData, period?: string) => void;
  setCheckoutStage: (stage: CheckoutSidebarProps["checkoutStage"]) => void;
  setError: (error: CheckoutSidebarProps["error"]) => void;
  setIsLoading: (isLoading: CheckoutSidebarProps["isLoading"]) => void;
  setPlanPeriod: (period: CheckoutSidebarProps["planPeriod"]) => void;
  setSetupIntent: (setupIntent: CheckoutSidebarProps["setupIntent"]) => void;
  setupIntent?: SetupIntentResponseData;
  showPaymentForm: boolean;
}

export const CheckoutSidebar = ({
  charges,
  checkoutStage,
  currentPlan,
  error,
  isLoading,
  paymentMethod,
  paymentMethodId,
  planPeriod,
  planPeriodOptions,
  selectedPlan,
  selectPlan,
  setCheckoutStage,
  setError,
  setIsLoading,
  setPlanPeriod,
  setSetupIntent,
  showPaymentForm,
}: CheckoutSidebarProps) => {
  const theme = useTheme();

  const { api, data, setLayout } = useEmbed();

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

  const isLightBackground = useMemo(() => {
    return hexToHSL(theme.card.background).l > 50;
  }, [theme.card.background]);

  const changePlanPeriod = useCallback(
    (period: string) => {
      setPlanPeriod(period);
      if (selectedPlan) {
        selectPlan(selectedPlan, period);
      }
    },
    [setPlanPeriod, selectedPlan, selectPlan],
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
  }, [
    api,
    paymentMethodId,
    planPeriod,
    selectedPlan,
    setError,
    setIsLoading,
    setLayout,
  ]);

  const allowCheckout =
    api &&
    selectedPlan &&
    ((paymentMethod && !showPaymentForm) || paymentMethodId) &&
    !isLoading;

  return (
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
          isLightBackground ? "hsla(0, 0%, 0%, 0.1)" : "hsla(0, 0%, 100%, 0.2)"
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
          isLightBackground ? "hsla(0, 0%, 0%, 0.1)" : "hsla(0, 0%, 100%, 0.2)"
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
                {...(selectedPlan && {
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

          {selectedPlan && (
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
          <StyledButton
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
          </StyledButton>
        ) : (
          <StyledButton
            disabled={isLoading || !allowCheckout}
            isLoading={isLoading}
            {...(allowCheckout && { onClick: checkout })}
          >
            Pay now
          </StyledButton>
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
  );
};
