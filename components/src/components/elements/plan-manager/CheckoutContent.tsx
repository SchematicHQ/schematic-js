import { useMemo } from "react";
import { useTheme } from "styled-components";
import { type Stripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import type {
  BillingPlan,
  CompanyPlanDetailResponseData,
  SetupIntentResponseData,
} from "../../../api";
import { TEXT_BASE_SIZE } from "../../../const";
import { useEmbed } from "../../../hooks";
import { hexToHSL, formatCurrency } from "../../../utils";
import {
  Box,
  Flex,
  Icon,
  IconRound,
  Text,
  Tooltip,
  type IconNameTypes,
} from "../../ui";
import { PaymentMethod } from "../payment-method";
import { FeatureName } from "./FeatureName";
import { PaymentForm } from "./PaymentForm";
import { StyledButton } from "./styles";

interface CheckoutContentProps {
  availablePlans: CompanyPlanDetailResponseData[];
  checkoutStage: "plan" | "checkout";
  currentPlan?: BillingPlan;
  isLoading: boolean;
  planPeriod: string;
  selectedPlan?: CompanyPlanDetailResponseData;
  selectPlan: (plan: CompanyPlanDetailResponseData, period?: string) => void;
  setPaymentMethodId: (id: string) => void;
  setShowPaymentForm: (show: boolean) => void;
  setupIntent?: SetupIntentResponseData;
  showPaymentForm: boolean;
  stripe: Promise<Stripe | null> | null;
}

export const CheckoutContent = ({
  availablePlans,
  checkoutStage,
  currentPlan,
  isLoading,
  planPeriod,
  selectedPlan,
  selectPlan,
  setPaymentMethodId,
  setShowPaymentForm,
  setupIntent,
  showPaymentForm,
  stripe,
}: CheckoutContentProps) => {
  const theme = useTheme();

  const { data } = useEmbed();

  const isLightBackground = useMemo(() => {
    return hexToHSL(theme.card.background).l > 50;
  }, [theme.card.background]);

  return (
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
                    (a.yearlyPrice?.price ?? 0) - (b.yearlyPrice?.price ?? 0)
                  );
                }

                if (planPeriod === "month") {
                  return (
                    (a.monthlyPrice?.price ?? 0) - (b.monthlyPrice?.price ?? 0)
                  );
                }

                return 0;
              })
              .map((plan) => {
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

                      {(plan.current || plan.id === currentPlan?.id) && (
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
                                    entitlement.feature.icon as IconNameTypes
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
                      {plan.id === selectedPlan?.id && (
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

                      {plan.id !== selectedPlan?.id && (
                        <Box $position="relative">
                          <StyledButton
                            disabled={isLoading || plan.valid === false}
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
                          </StyledButton>
                        </Box>
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
              <PaymentForm
                plan={selectedPlan}
                period={planPeriod}
                onConfirm={(value) => {
                  setPaymentMethodId(value);
                }}
              />

              {data.subscription?.paymentMethod && (
                <Box
                  tabIndex={0}
                  onClick={() => setShowPaymentForm(false)}
                  $cursor="pointer"
                >
                  <Text
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

              <Box
                tabIndex={0}
                onClick={() => setShowPaymentForm(true)}
                $cursor="pointer"
              >
                <Text
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
  );
};
