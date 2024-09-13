import { useEffect, useMemo, useState } from "react";
import { useTheme } from "styled-components";
import type { CompanyPlanDetailResponseData } from "../../../api";
import { useEmbed } from "../../../hooks";
import { lighten, darken, hexToHSL, formatCurrency } from "../../../utils";
import {
  Box,
  Flex,
  Icon,
  IconRound,
  Modal,
  ModalHeader,
  Text,
  type IconNameTypes,
} from "../../ui";
import { PaymentForm } from "./PaymentForm";
import { StyledButton } from "./styles";

export const CheckoutDialog = () => {
  const [checkoutStage, setCheckoutStage] = useState<"plan" | "checkout">(
    "plan",
  );
  const [planPeriod, setPlanPeriod] = useState<"month" | "year">("month");
  const [selectedPlan, setSelectedPlan] =
    useState<CompanyPlanDetailResponseData>();
  const [paymentMethodId, setPaymentMethodId] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckoutComplete, setIsCheckoutComplete] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const theme = useTheme();

  const { api, data, settings, fetchComponent } = useEmbed();

  const { currentPlan, availablePlans } = useMemo(() => {
    return {
      currentPlan: data.company?.plan,
      availablePlans: data.activePlans,
    };
  }, [data.company, data.activePlans]);

  const savingsPercentage = useMemo(() => {
    if (selectedPlan) {
      const monthly = (selectedPlan?.monthlyPrice?.price || 0) * 12;
      const yearly = selectedPlan?.yearlyPrice?.price || 0;
      return Math.round(((monthly - yearly) / monthly) * 10000) / 100;
    }

    return 0;
  }, [selectedPlan]);

  // TODO: reload component after checkout
  useEffect(() => {
    if (isCheckoutComplete && api && data.component?.id) {
      fetchComponent(data.component.id, api);
    }
  }, [isCheckoutComplete, api, data.component?.id, fetchComponent]);

  return (
    <Modal>
      <ModalHeader>
        <Flex $gap="1rem">
          {!isCheckoutComplete && (
            <>
              <Flex $gap="0.5rem" $alignItems="center">
                {checkoutStage === "plan" ? (
                  <Box
                    $width="0.9375rem"
                    $height="0.9375rem"
                    $borderWidth="2px"
                    $borderStyle="solid"
                    $borderColor={
                      hexToHSL(theme.card.background).l > 50
                        ? darken(theme.card.background, 12.5)
                        : lighten(theme.card.background, 12.5)
                    }
                    $borderRadius="9999px"
                  />
                ) : (
                  <IconRound
                    name="check"
                    style={{
                      color: theme.card.background,
                      backgroundColor:
                        hexToHSL(theme.card.background).l > 50
                          ? darken(theme.card.background, 12.5)
                          : lighten(theme.card.background, 12.5),
                      fontSize: 16,
                      width: "1rem",
                      height: "1rem",
                    }}
                  />
                )}
                <Box
                  tabIndex={0}
                  {...(checkoutStage !== "plan" && {
                    $opacity: 0.625,
                    $cursor: "pointer",
                    onClick: () => setCheckoutStage("plan"),
                  })}
                >
                  <Text
                    $font={theme.typography.text.fontFamily}
                    $size={theme.typography.text.fontSize}
                    $weight={checkoutStage === "plan" ? 700 : 400}
                    $color={theme.typography.text.color}
                  >
                    1. Select plan
                  </Text>
                </Box>
                <Icon
                  name="chevron-right"
                  style={{
                    fontSize: 16,
                    color:
                      hexToHSL(theme.card.background).l > 50
                        ? darken(theme.card.background, 17.5)
                        : lighten(theme.card.background, 17.5),
                  }}
                />
              </Flex>
              <Flex $gap="0.5rem" $alignItems="center">
                <Box
                  $width="0.9375rem"
                  $height="0.9375rem"
                  $borderWidth="2px"
                  $borderStyle="solid"
                  $borderColor={
                    hexToHSL(theme.card.background).l > 50
                      ? darken(theme.card.background, 12.5)
                      : lighten(theme.card.background, 12.5)
                  }
                  $borderRadius="9999px"
                />
                <Box
                  tabIndex={0}
                  {...(checkoutStage !== "checkout" && {
                    $opacity: 0.625,
                  })}
                >
                  <Text
                    $font={theme.typography.text.fontFamily}
                    $size={theme.typography.text.fontSize}
                    $weight={checkoutStage === "checkout" ? 700 : 400}
                    $color={theme.typography.text.color}
                  >
                    2. Checkout
                  </Text>
                </Box>
              </Flex>
            </>
          )}
        </Flex>
      </ModalHeader>

      {isCheckoutComplete && (
        <Flex $justifyContent="center" $alignItems="center">
          <Text
            as="h1"
            $font={theme.typography.heading1.fontFamily}
            $size={theme.typography.heading1.fontSize}
            $weight={theme.typography.heading1.fontWeight}
            $color={theme.typography.heading1.color}
          >
            Subscription updated!
          </Text>
        </Flex>
      )}

      {!isCheckoutComplete && (
        <Flex $position="relative">
          <Flex
            $position="absolute"
            $top="0"
            $left="0"
            $flexDirection="column"
            $gap="1rem"
            $padding="2rem 2.5rem 2rem 2.5rem"
            $backgroundColor={darken(settings.theme.card.background, 2.5)}
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
                  {availablePlans?.map((plan) => {
                    return (
                      <Flex
                        key={plan.id}
                        $flexDirection="column"
                        $backgroundColor={settings.theme.card.background}
                        $flex="1"
                        $outlineWidth="2px"
                        $outlineStyle="solid"
                        $outlineColor={
                          plan.id === selectedPlan?.id
                            ? theme.primary
                            : "transparent"
                        }
                        $borderRadius={`${settings.theme.card.borderRadius / 16}rem`}
                        {...(settings.theme.card.hasShadow && {
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
                          $padding={`${settings.theme.card.padding / 16}rem`}
                          $borderBottomWidth="1px"
                          $borderStyle="solid"
                          $borderColor={
                            hexToHSL(theme.card.background).l > 50
                              ? darken(theme.card.background, 17.5)
                              : lighten(theme.card.background, 17.5)
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
                          {plan.features.map((feature) => {
                            return (
                              <Flex
                                key={feature.id}
                                $flexShrink="0"
                                $gap="1rem"
                              >
                                <IconRound
                                  name={feature.icon as IconNameTypes}
                                  size="tn"
                                  colors={[
                                    settings.theme.primary,
                                    `${hexToHSL(settings.theme.card.background).l > 50 ? darken(settings.theme.card.background, 10) : lighten(settings.theme.card.background, 20)}`,
                                  ]}
                                />

                                <Flex $alignItems="center">
                                  <Text $size={12}>{feature.name}</Text>
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
                                style={{
                                  color:
                                    hexToHSL(theme.card.background).l > 50
                                      ? "#000000"
                                      : "#FFFFFF",
                                  lineHeight: "1.4",
                                }}
                              >
                                Selected
                              </Text>
                            </Flex>
                          )}

                          {!(plan.current || plan.id === currentPlan?.id) &&
                            plan.id !== selectedPlan?.id && (
                              <StyledButton
                                disabled={plan.valid === false}
                                $size="sm"
                                $color="primary"
                                $variant="outline"
                                onClick={() => {
                                  setSelectedPlan(plan);
                                }}
                              >
                                Select
                              </StyledButton>
                            )}
                        </Flex>
                      </Flex>
                    );
                  })}
                </Flex>
              </>
            )}

            {selectedPlan && checkoutStage === "checkout" && (
              <PaymentForm
                plan={selectedPlan}
                period={planPeriod}
                onConfirm={(value) => {
                  setPaymentMethodId(value);
                }}
              />
            )}
          </Flex>

          <Flex
            $position="absolute"
            $top="0"
            $right="0"
            $flexDirection="column"
            $background={settings.theme.card.background}
            $borderRadius="0 0 0.5rem"
            $width="21.5rem"
            $boxShadow="0px 1px 20px 0px #1018280F, 0px 1px 3px 0px #1018281A;"
          >
            <Flex
              $flexDirection="column"
              $position="relative"
              $gap="1rem"
              $width="100%"
              $height="auto"
              $padding="1.5rem"
              $borderBottomWidth="1px"
              $borderStyle="solid"
              $borderColor={
                hexToHSL(settings.theme.card.background).l > 50
                  ? darken(settings.theme.card.background, 15)
                  : lighten(settings.theme.card.background, 15)
              }
            >
              <Flex $justifyContent="space-between">
                <Text $size={20} $weight={600}>
                  Subscription
                </Text>
              </Flex>

              <Flex
                $borderWidth="1px"
                $borderStyle="solid"
                $borderColor={
                  hexToHSL(settings.theme.card.background).l > 50
                    ? darken(settings.theme.card.background, 15)
                    : lighten(settings.theme.card.background, 15)
                }
                $borderRadius="2.5rem"
                $cursor="pointer"
              >
                <Flex
                  onClick={() => setPlanPeriod("month")}
                  $justifyContent="center"
                  $alignItems="center"
                  $padding="0.25rem 0.5rem"
                  $flex="1"
                  $backgroundColor={
                    planPeriod === "month"
                      ? darken(settings.theme.card.background, 8)
                      : lighten(settings.theme.card.background, 2)
                  }
                  $borderRadius="2.5rem"
                >
                  <Text $size={12} $weight={planPeriod === "month" ? 600 : 400}>
                    Billed monthly
                  </Text>
                </Flex>
                <Flex
                  onClick={() => setPlanPeriod("year")}
                  $justifyContent="center"
                  $alignItems="center"
                  $padding="0.25rem 0.5rem"
                  $flex="1"
                  $backgroundColor={
                    planPeriod === "year"
                      ? darken(settings.theme.card.background, 8)
                      : lighten(settings.theme.card.background, 2)
                  }
                  $borderRadius="2.5rem"
                >
                  <Text $size={12} $weight={planPeriod === "year" ? 600 : 400}>
                    Billed yearly
                  </Text>
                </Flex>
              </Flex>

              {savingsPercentage > 0 && (
                <Box>
                  <Text $size={11} $color={theme.primary}>
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
              $gap="1rem"
              $width="100%"
              $height="auto"
              $padding="1.5rem"
              $flex="1"
              $borderBottomWidth="1px"
              $borderStyle="solid"
              $borderColor={
                hexToHSL(settings.theme.card.background).l > 50
                  ? darken(settings.theme.card.background, 15)
                  : lighten(settings.theme.card.background, 15)
              }
            >
              <Box>
                <Text
                  $size={14}
                  $color={
                    hexToHSL(settings.theme.card.background).l > 50
                      ? darken(settings.theme.card.background, 62.5)
                      : lighten(settings.theme.card.background, 62.5)
                  }
                >
                  Plan
                </Text>
              </Box>

              <Flex
                $flexDirection="column"
                $fontSize="0.875rem"
                $color={
                  hexToHSL(settings.theme.card.background).l > 50
                    ? darken(settings.theme.card.background, 62.5)
                    : lighten(settings.theme.card.background, 62.5)
                }
                $gap="0.5rem"
              >
                {currentPlan && (
                  <Flex
                    $alignItems="center"
                    $justifyContent="space-between"
                    $fontSize="0.875rem"
                    $color={
                      hexToHSL(settings.theme.card.background).l > 50
                        ? darken(settings.theme.card.background, 62.5)
                        : lighten(settings.theme.card.background, 62.5)
                    }
                  >
                    <Flex
                      $fontSize="0.875rem"
                      {...(selectedPlan
                        ? {
                            $color:
                              hexToHSL(settings.theme.card.background).l > 50
                                ? darken(settings.theme.card.background, 62.5)
                                : lighten(settings.theme.card.background, 62.5),
                            $textDecoration: "line-through",
                          }
                        : {
                            $color:
                              hexToHSL(settings.theme.card.background).l > 50
                                ? "#000000"
                                : "#FFFFFF",
                          })}
                    >
                      {currentPlan.name}
                    </Flex>

                    {typeof currentPlan.planPrice === "number" &&
                      currentPlan.planPeriod && (
                        <Flex $fontSize="0.75rem" $color="#000000">
                          {formatCurrency(currentPlan.planPrice)}/
                          {currentPlan.planPeriod}
                        </Flex>
                      )}
                  </Flex>
                )}

                {selectedPlan && (
                  <>
                    <Box
                      $width="100%"
                      $textAlign="left"
                      $opacity="50%"
                      $marginBottom="-0.25rem"
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
                      $alignItems="center"
                      $justifyContent="space-between"
                      $fontSize="0.875rem"
                      $color={
                        hexToHSL(settings.theme.card.background).l > 50
                          ? darken(settings.theme.card.background, 62.5)
                          : lighten(settings.theme.card.background, 62.5)
                      }
                    >
                      <Flex
                        $fontSize="0.875rem"
                        $color={
                          hexToHSL(settings.theme.card.background).l > 50
                            ? "#000000"
                            : "#FFFFFF"
                        }
                        $fontWeight="600"
                      >
                        {selectedPlan.name}
                      </Flex>

                      <Flex
                        $fontSize="0.75rem"
                        $color={
                          hexToHSL(settings.theme.card.background).l > 50
                            ? "#000000"
                            : "#FFFFFF"
                        }
                      >
                        {formatCurrency(
                          (planPeriod === "month"
                            ? selectedPlan.monthlyPrice
                            : selectedPlan.yearlyPrice
                          )?.price ?? 0,
                        )}
                        /{planPeriod}
                      </Flex>
                    </Flex>
                  </>
                )}
              </Flex>
            </Flex>
            <Flex
              $flexDirection="column"
              $position="relative"
              $gap="1rem"
              $width="100%"
              $height="auto"
              $padding="1.5rem"
            >
              {selectedPlan && (
                <Flex
                  $fontSize="0.75rem"
                  $color={
                    hexToHSL(settings.theme.card.background).l > 50
                      ? darken(settings.theme.card.background, 62.5)
                      : lighten(settings.theme.card.background, 62.5)
                  }
                  $justifyContent="space-between"
                >
                  <Box
                    $fontSize="0.75rem"
                    $color={
                      hexToHSL(settings.theme.card.background).l > 50
                        ? darken(settings.theme.card.background, 62.5)
                        : lighten(settings.theme.card.background, 62.5)
                    }
                  >
                    {planPeriod === "month" ? "Monthly" : "Yearly"} total:{" "}
                  </Box>
                  <Box
                    $fontSize="0.75rem"
                    $color={
                      hexToHSL(settings.theme.card.background).l > 50
                        ? "#000000"
                        : "#FFFFFF"
                    }
                  >
                    {formatCurrency(
                      (planPeriod === "month"
                        ? selectedPlan.monthlyPrice
                        : selectedPlan.yearlyPrice
                      )?.price ?? 0,
                    )}
                    /{planPeriod}
                  </Box>
                </Flex>
              )}

              {checkoutStage === "plan" ? (
                <StyledButton
                  disabled={!selectedPlan}
                  onClick={() => {
                    setCheckoutStage("checkout");
                  }}
                  $size="sm"
                >
                  <Flex
                    $gap="0.5rem"
                    $alignItems="center"
                    $justifyContent="center"
                    $padding="0 1rem"
                  >
                    <Text $align="left">Next: Checkout</Text>
                    <Icon name="arrow-right" />
                  </Flex>
                </StyledButton>
              ) : (
                <StyledButton
                  disabled={
                    !api ||
                    !selectedPlan ||
                    selectedPlan?.id === currentPlan?.id ||
                    !paymentMethodId ||
                    isLoading
                  }
                  onClick={async () => {
                    const priceId = (
                      planPeriod === "month"
                        ? selectedPlan?.monthlyPrice
                        : selectedPlan?.yearlyPrice
                    )?.id;
                    if (!api || !selectedPlan || !priceId || !paymentMethodId) {
                      return;
                    }

                    try {
                      setIsLoading(true);
                      setIsCheckoutComplete(false);
                      await api.checkout({
                        changeSubscriptionRequestBody: {
                          newPlanId: selectedPlan.id,
                          newPriceId: priceId,
                          paymentMethodId: paymentMethodId,
                        },
                      });
                      // throw new Error("Test error.");
                      setIsCheckoutComplete(true);
                    } catch {
                      setError(
                        "Error processing payment. Please try a different payment method.",
                      );
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  $size="md"
                >
                  Pay now
                </StyledButton>
              )}

              <Box>
                <Text
                  $size={15}
                  $color={
                    hexToHSL(theme.card.background).l > 50
                      ? darken(theme.card.background, 62.5)
                      : lighten(theme.card.background, 62.5)
                  }
                >
                  Discounts & credits applied at checkout
                </Text>
              </Box>

              {error && (
                <Box>
                  <Text $size={15} $weight={500} $color="#DB6669">
                    {error}
                  </Text>
                </Box>
              )}
            </Flex>
          </Flex>
        </Flex>
      )}
    </Modal>
  );
};
