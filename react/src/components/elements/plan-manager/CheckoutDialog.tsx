import {
  useEffect,
  useMemo,
  useRef,
  useState,
  Dispatch,
  ReactNode,
  SetStateAction,
  useCallback,
} from "react";
import { useEmbed } from "../../../hooks";
import { Box, Flex, Icon, IconRound, Text, type IconNameTypes } from "../../ui";
import { PaymentForm } from "./PaymentForm";
import { StyledButton } from "./styles";
import type { BillingPlan, CompanyPlanDetailResponseData } from "../../../api";
import { formatCurrency } from "../../../utils";

export const OverlayHeader = ({
  children,
  onClose,
}: {
  children: ReactNode;
  onClose?: () => void;
}) => {
  const { setLayout } = useEmbed();

  const handleClose = useCallback(() => {
    setLayout("portal");
    onClose?.();
  }, [setLayout, onClose]);

  return (
    <Flex
      $paddingLeft="2.5rem"
      $paddingRight="2.5rem"
      $padding=".75rem 2.5rem"
      $flexDirection="row"
      $justifyContent="space-between"
      $alignItems="center"
      $borderBottom="1px solid #DEDEDE"
      $gap="1rem"
      $backgroundColor="#FFFFFF"
      $borderRadius=".5rem .5rem 0 0"
    >
      {children}

      <div>
        <Box $cursor="pointer" onClick={handleClose}>
          <Icon name="close" style={{ fontSize: 36, color: "#B8B8B8" }} />
        </Box>
      </div>
    </Flex>
  );
};

export const OverlayWrapper = ({
  children,
  size = "lg",
  onClose,
}: {
  children: ReactNode;
  size?: "md" | "lg";
  onClose?: () => void;
}) => {
  const { setLayout } = useEmbed();

  const ref = useRef<HTMLDivElement>(null);

  const sizeWidthMap = {
    md: "700px",
    lg: "75%",
  };

  const sizeHeighthMap = {
    md: "auto",
    lg: "75%",
  };

  const sizeMaxWidthMap = {
    md: "auto",
    lg: "1140px",
  };

  const handleClose = useCallback(() => {
    setLayout("portal");
    onClose?.();
  }, [setLayout, onClose]);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  return (
    <Box
      ref={ref}
      tabIndex={0}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          handleClose();
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          handleClose();
        }
      }}
      $position="absolute"
      $top="50%"
      $left="50%"
      $zIndex="999999"
      $transform="translate(-50%, -50%)"
      $width="100%"
      $height="100%"
      $backgroundColor="#D9D9D9"
      $overflow="hidden"
    >
      <Flex
        $position="relative"
        $top="50%"
        $left="50%"
        $transform="translate(-50%, -50%)"
        $flexDirection="column"
        $maxWidth={sizeMaxWidthMap[size]}
        $width={sizeWidthMap[size]}
        $height={sizeHeighthMap[size]}
        $backgroundColor="#FBFBFB"
        $borderBottom="1px solid #DEDEDE"
        $borderRadius="8px"
        $boxShadow="0px 1px 20px 0px #1018280F, 0px 1px 3px 0px #1018281A;"
        id="select-plan-dialog"
        role="dialog"
        aria-labelledby="select-plan-dialog-label"
        aria-modal="true"
      >
        {children}
      </Flex>
    </Box>
  );
};

export const OverlaySideBar = ({
  pricePeriod,
  setPricePeriod,
  checkoutStage,
  setCheckoutStage,
  currentPlan,
  selectedPlan,
  paymentMethodId,
}: {
  pricePeriod: "month" | "year";
  setPricePeriod: Dispatch<SetStateAction<"month" | "year">>;
  checkoutStage: "plan" | "checkout";
  setCheckoutStage: Dispatch<SetStateAction<"plan" | "checkout">>;
  currentPlan?: BillingPlan;
  selectedPlan?: CompanyPlanDetailResponseData;
  paymentMethodId?: string;
}) => {
  const { api } = useEmbed();

  const savingsPercentage = useMemo(() => {
    if (selectedPlan && pricePeriod === "month") {
      const monthly = (selectedPlan?.monthlyPrice?.price || 0) * 12;
      const yearly = selectedPlan?.yearlyPrice?.price || 0;
      return Math.round(((monthly - yearly) / monthly) * 10000) / 100;
    }

    return 0;
  }, [selectedPlan, pricePeriod]);

  return (
    <Flex
      $flexDirection="column"
      $background="white"
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
        <Flex $flexDirection="row" $justifyContent="space-between">
          <Text $size={20} $weight={600}>
            Subscription
          </Text>
        </Flex>

        <Flex
          $flexDirection="row"
          $border="1px solid #D9D9D9"
          $borderRadius="40px"
          $fontSize="12px"
          $textAlign="center"
          $cursor="pointer"
        >
          <Box
            onClick={() => setPricePeriod("month")}
            $padding=".25rem .5rem"
            $flex="1"
            $fontWeight={pricePeriod === "month" ? "600" : "400"}
            $backgroundColor={pricePeriod === "month" ? "#DDDDDD" : "white"}
            $borderRadius="40px"
          >
            Billed monthly
          </Box>
          <Box
            onClick={() => setPricePeriod("year")}
            $padding=".25rem .5rem"
            $flex="1"
            $fontWeight={pricePeriod === "year" ? "600" : "400"}
            $backgroundColor={pricePeriod === "year" ? "#DDDDDD" : "white"}
            $borderRadius="40px"
          >
            Billed yearly
          </Box>
        </Flex>

        {savingsPercentage > 0 && (
          <Box $fontSize="11px" $color="#194BFB">
            Save up to {savingsPercentage}% with yearly billing
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
        <Box $fontSize="14px" $color="#5D5D5D">
          Plan
        </Box>

        <Flex
          $flexDirection="column"
          $fontSize="14px"
          $color="#5D5D5D"
          $gap=".5rem"
        >
          {currentPlan && (
            <Flex
              $flexDirection="row"
              $alignItems="center"
              $justifyContent="space-between"
              $fontSize="14px"
              $color="#5D5D5D"
            >
              <Flex $fontSize="14px" $color="#5D5D5D">
                {currentPlan.name}
              </Flex>

              {typeof currentPlan.planPrice === "number" &&
                currentPlan.planPeriod && (
                  <Flex $fontSize="12px" $color="#000000">
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
                $marginBottom="-.25rem"
                $marginTop="-.25rem"
              >
                <Icon
                  name="arrow-down"
                  style={{
                    display: "inline-block",
                  }}
                />
              </Box>

              <Flex
                $flexDirection="row"
                $alignItems="center"
                $justifyContent="space-between"
                $fontSize="14px"
                $color="#5D5D5D"
              >
                <Flex $fontSize="14px" $color="#000000" $fontWeight="600">
                  {selectedPlan.name}
                </Flex>

                <Flex $fontSize="12px" $color="#000000">
                  {formatCurrency(
                    (pricePeriod === "month"
                      ? selectedPlan.monthlyPrice
                      : selectedPlan.yearlyPrice
                    )?.price ?? 0,
                  )}
                  /{pricePeriod}
                </Flex>
              </Flex>
            </>
          )}
        </Flex>
      </Flex>
      <Flex
        $flexDirection="column"
        $position="relative"
        $gap=".75rem"
        $width="100%"
        $height="auto"
        $padding="1.5rem"
      >
        {selectedPlan && (
          <Flex
            $fontSize="12px"
            $color="#5D5D5D"
            $justifyContent="space-between"
          >
            <Box $fontSize="12px" $color="#5D5D5D">
              Monthly total:{" "}
            </Box>
            <Box $fontSize="12px" $color="#000000">
              {formatCurrency(
                (pricePeriod === "month"
                  ? selectedPlan.monthlyPrice
                  : selectedPlan.yearlyPrice
                )?.price ?? 0,
              )}
              /{pricePeriod}
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
            <Flex $gap="0.5rem" $alignItems="center" $justifyContent="center">
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
              !paymentMethodId
            }
            onClick={async () => {
              const priceId = (
                pricePeriod === "month"
                  ? selectedPlan?.monthlyPrice
                  : selectedPlan?.yearlyPrice
              )?.id;
              if (!api || !selectedPlan || !priceId || !paymentMethodId) {
                return;
              }

              await api.checkout({
                changeSubscriptionRequestBody: {
                  newPlanId: selectedPlan.id,
                  newPriceId: priceId,
                  paymentMethodId: paymentMethodId,
                },
              });
            }}
            $size="md"
          >
            Pay now
          </StyledButton>
        )}

        <Box $fontSize="12px" $color="#5D5D5D">
          Discounts & credits applied at checkout
        </Box>
      </Flex>
    </Flex>
  );
};

export const CheckoutDialog = () => {
  const [checkoutStage, setCheckoutStage] = useState<"plan" | "checkout">(
    "plan",
  );
  const [planPeriod, setPlanPeriod] = useState<"month" | "year">("month");
  const [selectedPlan, setSelectedPlan] =
    useState<CompanyPlanDetailResponseData>();
  const [paymentMethodId, setPaymentMethodId] = useState<string | undefined>();

  const { data } = useEmbed();

  const { currentPlan, availablePlans } = useMemo(() => {
    return {
      currentPlan: data.company?.plan,
      availablePlans: data.activePlans,
    };
  }, [data.company, data.activePlans]);

  return (
    <OverlayWrapper>
      <OverlayHeader>
        <Flex $gap="1rem">
          <Flex $flexDirection="row" $gap="0.5rem" $alignItems="center">
            {checkoutStage === "plan" ? (
              <Box
                $width="15px"
                $height="15px"
                $backgroundColor="white"
                $border="2px solid #DDDDDD"
                $borderRadius="999px"
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
            <div
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
              1. Select plan
            </div>
            <Icon
              name="chevron-right"
              style={{ fontSize: 16, color: "#D0D0D0" }}
            />
          </Flex>
          <Flex $flexDirection="row" $gap="0.5rem" $alignItems="center">
            <Box
              $width="15px"
              $height="15px"
              $border="2px solid #DDDDDD"
              $borderRadius="999px"
              $backgroundColor="white"
            />
            <div
              tabIndex={0}
              {...(checkoutStage === "checkout" && {
                style: {
                  fontWeight: "700",
                },
              })}
            >
              2. Checkout
            </div>
          </Flex>
        </Flex>
      </OverlayHeader>

      {/* Content + Sidebar */}
      <Flex $flexDirection="row" $height="100%">
        <Flex
          $flexDirection="column"
          $gap="1rem"
          $padding="2rem 2.5rem 2rem 2.5rem"
          $backgroundColor="#FBFBFB"
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
                  $marginBottom=".5rem"
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

              <Flex $flexDirection="row" $gap="1rem" $flex="1" $height="100%">
                {availablePlans?.map((plan) => {
                  return (
                    <Flex
                      key={plan.id}
                      $height="100%"
                      $flexDirection="column"
                      $backgroundColor="white"
                      $flex="1"
                      $border={`2px solid ${plan.id === selectedPlan?.id ? "#194BFB" : "transparent"}`}
                      $borderRadius=".5rem"
                      $boxShadow="0px 1px 3px rgba(16, 24, 40, 0.1), 0px 1px 20px rgba(16, 24, 40, 0.06)"
                    >
                      <Flex
                        $flexDirection="column"
                        $position="relative"
                        $gap="1rem"
                        $width="100%"
                        $height="auto"
                        $padding="2rem 1.5rem 1.5rem"
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
                          <Box $display="inline-block" $fontSize=".75rem">
                            /{planPeriod}
                          </Box>
                        </Text>
                        {(plan.current || plan.id === currentPlan?.id) && (
                          <Flex
                            $position="absolute"
                            $right="1rem"
                            $top="1rem"
                            $fontSize=".625rem"
                            $color="white"
                            $backgroundColor="#194BFB"
                            $borderRadius="999px"
                            $padding=".125rem .85rem"
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
                            <Flex key={feature.id} $flexShrink="0" $gap="1rem">
                              <IconRound
                                name={feature.icon as IconNameTypes}
                                size="tn"
                                colors={["#000000", "#F5F5F5"]}
                              />

                              <Flex $alignItems="center">
                                <Text $size=".75rem" $color="#00000">
                                  {feature.name}
                                </Text>
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

                            <span
                              style={{
                                color: "#7B7B7B",
                                lineHeight: "1.4",
                              }}
                            >
                              Selected
                            </span>
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

        <OverlaySideBar
          pricePeriod={planPeriod}
          setPricePeriod={setPlanPeriod}
          checkoutStage={checkoutStage}
          setCheckoutStage={setCheckoutStage}
          currentPlan={currentPlan}
          selectedPlan={selectedPlan}
          paymentMethodId={paymentMethodId}
        />
      </Flex>
    </OverlayWrapper>
  );
};