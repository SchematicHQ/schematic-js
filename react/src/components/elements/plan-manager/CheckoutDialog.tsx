import { useMemo, useState } from "react";
import type { CompanyPlanDetailResponseData } from "../../../api";
import { useEmbed } from "../../../hooks";
import { lighten, darken, formatCurrency } from "../../../utils";
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

  const { api, data, settings } = useEmbed();

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
                    $border="2px solid #DDDDDD"
                    $borderRadius="9999px"
                  />
                ) : (
                  <IconRound
                    name="check"
                    style={{
                      color: "#FFFFFF",
                      backgroundColor: "#DDDDDD",
                      fontSize: 16,
                      width: "1rem",
                      height: "1rem",
                    }}
                  />
                )}
                <Box
                  tabIndex={0}
                  {...(checkoutStage === "plan"
                    ? {
                        style: {
                          fontWeight: "700",
                        },
                      }
                    : {
                        style: {
                          cursor: "pointer",
                        },
                        onClick: () => setCheckoutStage("plan"),
                      })}
                >
                  <Text>1. Select plan</Text>
                </Box>
                <Icon
                  name="chevron-right"
                  style={{ fontSize: 16, color: "#D0D0D0" }}
                />
              </Flex>
              <Flex $gap="0.5rem" $alignItems="center">
                <Box
                  $width="0.9375rem"
                  $height="0.9375rem"
                  $border="2px solid #DDDDDD"
                  $borderRadius="9999px"
                />
                <Box
                  tabIndex={0}
                  {...(checkoutStage === "checkout" && {
                    style: {
                      fontWeight: "700",
                    },
                  })}
                >
                  <Text>2. Checkout</Text>
                </Box>
              </Flex>
            </>
          )}
        </Flex>
      </ModalHeader>

      {isCheckoutComplete && (
        <Flex $justifyContent="center" $alignItems="center" $flexGrow="1">
          <Text as="h1" $size={37} $weight={800}>
            Subscription updated!
          </Text>
        </Flex>
      )}

      {!isCheckoutComplete && (
        <Flex $height="100%">
          <Flex
            $flexDirection="column"
            $gap="1rem"
            $padding="2rem 2.5rem 2rem 2.5rem"
            $backgroundColor={darken(settings.theme.card.background, 2)}
            $borderRadius="0 0.5rem 0"
            $flex="1"
            $height="100%"
          >
            {checkoutStage === "plan" && (
              <>
                <Flex $flexDirection="column" $gap="1rem" $marginBottom="1rem">
                  <Text
                    as="h1"
                    id="select-plan-dialog-label"
                    $size={18}
                    $marginBottom="0.5rem"
                  >
                    Select plan
                  </Text>
                  <Text
                    as="p"
                    id="select-plan-dialog-description"
                    $size={14}
                    $weight={400}
                  >
                    Choose your base plan
                  </Text>
                </Flex>

                <Flex $gap="1rem" $flex="1" $height="100%">
                  {availablePlans?.map((plan) => {
                    return (
                      <Flex
                        key={plan.id}
                        $height="100%"
                        $flexDirection="column"
                        $backgroundColor={settings.theme.card.background}
                        $flex="1"
                        $border={`2px solid ${plan.id === selectedPlan?.id ? "#194BFB" : "transparent"}`}
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
                          $borderBottom="1px solid #DEDEDE"
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
                              $color="white"
                              $backgroundColor="#194BFB"
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
                                  colors={["#000000", "#F5F5F5"]}
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
                                  color: "#194BFB",
                                }}
                              />

                              <Text
                                style={{
                                  color: "#7B7B7B",
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
            $flexDirection="column"
            $background={lighten(settings.theme.card.background, 2)}
            $borderRadius="0 0 0.5rem"
            $maxWidth="275px"
            $height="100%"
            $boxShadow="0px 1px 20px 0px #1018280F, 0px 1px 3px 0px #1018281A;"
          >
            <Flex
              $flexDirection="column"
              $position="relative"
              $gap="1rem"
              $width="100%"
              $height="auto"
              $padding="1.5rem"
              $borderBottom="1px solid #DEDEDE"
            >
              <Flex $justifyContent="space-between">
                <Text $size={20} $weight={600}>
                  Subscription
                </Text>
              </Flex>

              <Flex
                $border="1px solid #D9D9D9"
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
                  <Text $size={11} $color="#194BFB">
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
              $borderBottom="1px solid #DEDEDE"
            >
              <Box>
                <Text $size={14} $color="#5D5D5D">
                  Plan
                </Text>
              </Box>

              <Flex
                $flexDirection="column"
                $fontSize="0.875rem"
                $color="#5D5D5D"
                $gap="0.5rem"
              >
                {currentPlan && (
                  <Flex
                    $alignItems="center"
                    $justifyContent="space-between"
                    $fontSize="0.875rem"
                    $color="#5D5D5D"
                  >
                    <Flex $fontSize="0.875rem" $color="#5D5D5D">
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
                      $color="#5D5D5D"
                    >
                      <Flex
                        $fontSize="0.875rem"
                        $color="#000000"
                        $fontWeight="600"
                      >
                        {selectedPlan.name}
                      </Flex>

                      <Flex $fontSize="0.75rem" $color="#000000">
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
              $gap="0.75rem"
              $width="100%"
              $height="auto"
              $padding="1.5rem"
            >
              {selectedPlan && (
                <Flex
                  $fontSize="0.75rem"
                  $color="#5D5D5D"
                  $justifyContent="space-between"
                >
                  <Box $fontSize="0.75rem" $color="#5D5D5D">
                    {planPeriod === "month" ? "Monthly" : "Yearly"} total:{" "}
                  </Box>
                  <Box $fontSize="0.75rem" $color="#000000">
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
                  $size="sm"
                  onClick={() => {
                    setCheckoutStage("checkout");
                  }}
                  {...(!selectedPlan && { disabled: true })}
                >
                  <Flex
                    $gap="0.5rem"
                    $alignItems="center"
                    $justifyContent="center"
                  >
                    <span>Next: Checkout</span>
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
                      setIsCheckoutComplete(true);
                    } catch (error) {
                      // TODO: handle checkout error
                      console.error(error);
                    } finally {
                      setIsCheckoutComplete(true);
                      setIsLoading(false);
                    }
                  }}
                  $size="md"
                >
                  Pay now
                </StyledButton>
              )}

              <Box $fontSize="0.75rem" $color="#5D5D5D">
                Discounts & credits applied at checkout
              </Box>
            </Flex>
          </Flex>
        </Flex>
      )}
    </Modal>
  );
};
