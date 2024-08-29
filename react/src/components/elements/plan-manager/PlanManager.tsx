import {
  forwardRef,
  useMemo,
  useState,
  Dispatch,
  ReactNode,
  SetStateAction,
} from "react";
import { createPortal } from "react-dom";
import { useEmbed } from "../../../hooks";
import { type FontStyle } from "../../../context";
import type { RecursivePartial, ElementProps } from "../../../types";
import { Box, Flex, Icon, IconRound, Text } from "../../ui";
import { CheckoutForm } from "./CheckoutForm";
import { StyledButton } from "./styles";

export const OverlayHeader = ({ children }: { children: ReactNode }) => {
  const { setLayout } = useEmbed();

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
        <Box
          $cursor="pointer"
          onClick={() => {
            setLayout("portal");
          }}
        >
          <Icon name="close" style={{ fontSize: 36, color: "#B8B8B8" }} />
        </Box>
      </div>
    </Flex>
  );
};

export const OverlayWrapper = ({
  children,
  size = "lg",
}: {
  children: ReactNode;
  size?: "md" | "lg";
}) => {
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

  return (
    <Box
      $position="absolute"
      $top="50%"
      $left="50%"
      $zIndex="999999"
      $transform="translate(-50%, -50%)"
      $width="100%"
      $height="100%"
      $backgroundColor="#D9D9D9"
    >
      <Flex
        $position="relative"
        $top="50%"
        $left="50%"
        $transform="translate(-50%, -50%)"
        $maxWidth={sizeMaxWidthMap[size]}
        $width={sizeWidthMap[size]}
        $height={sizeHeighthMap[size]}
        $backgroundColor="#FBFBFB"
        $borderRadius="8px"
        $boxShadow="0px 1px 20px 0px #1018280F, 0px 1px 3px 0px #1018281A;"
        id="select-plan-dialog"
        role="dialog"
        $borderBottom="1px solid #DEDEDE"
        aria-labelledby="select-plan-dialog-label"
        aria-modal="true"
        $flexDirection="column"
      >
        {children}
      </Flex>
    </Box>
  );
};

export const OverlaySideBar = ({
  pricePeriod,
  setPricePeriod,
  setCheckoutStage,
}: {
  pricePeriod: "month" | "year";
  setPricePeriod: Dispatch<SetStateAction<"month" | "year">>;
  setCheckoutStage: Dispatch<SetStateAction<"plan" | "checkout">>;
}) => {
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

          <Flex
            $border="1px solid #D9D9D9"
            $padding=".15rem .45rem .15rem .55rem"
            $alignItems="center"
            $borderRadius="5px"
            $fontSize="12px"
          >
            <Box $display="inline-block" $marginRight=".5rem">
              $ USD
            </Box>
            <Icon
              name="chevron-down"
              style={{
                fontSize: "20px",
                lineHeight: "1em",
              }}
            />
          </Flex>
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

        <Box $fontSize="11px" $color="#194BFB">
          Save up to 33% with yearly billing
        </Box>
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
        Plan details..
      </Flex>
      <Flex
        $flexDirection="column"
        $position="relative"
        $gap=".75rem"
        $width="100%"
        $height="auto"
        $padding="1.5rem"
      >
        <Flex $fontSize="12px" $color="#5D5D5D" $justifyContent="space-between">
          <Box $fontSize="12px" $color="#5D5D5D">
            Monthly total:{" "}
          </Box>
          <Box $fontSize="12px" $color="#000000">
            $285/mo
          </Box>
        </Flex>
        <StyledButton
          $size="sm"
          onClick={() => {
            setCheckoutStage("checkout");
          }}
        >
          <Flex $gap=".5rem" $alignItems="center" $justifyContent="center">
            <span>Next: Checkout</span>
            <Icon name="arrow-right" />
          </Flex>
        </StyledButton>

        <Box $fontSize="12px" $color="#5D5D5D">
          Discounts & credits applied at checkout
        </Box>
      </Flex>
    </Flex>
  );
};

interface DesignProps {
  header: {
    isVisible: boolean;
    title: {
      fontStyle: FontStyle;
    };
    description: {
      isVisible: boolean;
      fontStyle: FontStyle;
    };
    price: {
      isVisible: boolean;
      fontStyle: FontStyle;
    };
  };
  addOns: {
    isVisible: boolean;
    fontStyle: FontStyle;
    showLabel: boolean;
  };
  callToAction: {
    isVisible: boolean;
    buttonSize: "sm" | "md" | "lg";
    buttonStyle: "primary" | "secondary" | "tertiary";
  };
}

const resolveDesignProps = (
  props: RecursivePartial<DesignProps>,
): DesignProps => {
  return {
    header: {
      isVisible: props.header?.isVisible ?? true,
      title: {
        fontStyle: props.header?.title?.fontStyle ?? "heading1",
      },
      description: {
        isVisible: props.header?.description?.isVisible ?? true,
        fontStyle: props.header?.description?.fontStyle ?? "text",
      },
      price: {
        isVisible: props.header?.price?.isVisible ?? true,
        fontStyle: props.header?.price?.fontStyle ?? "text",
      },
    },
    addOns: {
      isVisible: props.addOns?.isVisible ?? true,
      fontStyle: props.addOns?.fontStyle ?? "heading4",
      showLabel: props.addOns?.showLabel ?? true,
    },
    callToAction: {
      isVisible: props.callToAction?.isVisible ?? true,
      buttonSize: props.callToAction?.buttonSize ?? "md",
      buttonStyle: props.callToAction?.buttonStyle ?? "secondary",
    },
  };
};

export type PlanManagerProps = DesignProps;

export const PlanManager = forwardRef<
  HTMLDivElement | null,
  ElementProps &
    RecursivePartial<DesignProps> &
    React.HTMLAttributes<HTMLDivElement> & {
      portal?: HTMLElement | null;
    }
>(({ children, className, portal, ...rest }, ref) => {
  const props = resolveDesignProps(rest);

  const [checkoutStage, setCheckoutStage] = useState<"plan" | "checkout">(
    "plan",
  );
  const [planPeriod, setPlanPeriod] = useState<"month" | "year">("month");

  const { data, settings, layout, stripe, setLayout } = useEmbed();

  const { currentPlan, canChangePlan, availablePlans } = useMemo(() => {
    const canChangePlan = stripe !== null;
    const availablePlans = data.activePlans?.map(
      ({ name, description, current, monthlyPrice, yearlyPrice }) => ({
        name,
        description,
        price:
          planPeriod === "month" ? monthlyPrice?.price : yearlyPrice?.price,
        current,
      }),
    );

    return {
      currentPlan: data.company?.plan,
      canChangePlan,
      availablePlans,
    };
  }, [data.company, data.stripeEmbed, data.activePlans, planPeriod]);

  return (
    <div ref={ref} className={className}>
      <Flex
        $flexDirection="column"
        $gap="0.75rem"
        {...(canChangePlan && { $margin: "0 0 0.5rem" })}
      >
        {props.header.isVisible && currentPlan && (
          <Flex
            $justifyContent="space-between"
            $alignItems="center"
            $width="100%"
            {...(canChangePlan && { $margin: "0 0 1.5rem" })}
          >
            <div>
              <Box $margin="0 0 0.75rem">
                <Text
                  $font={
                    settings.theme.typography[props.header.title.fontStyle]
                      .fontFamily
                  }
                  $size={
                    settings.theme.typography[props.header.title.fontStyle]
                      .fontSize
                  }
                  $weight={
                    settings.theme.typography[props.header.title.fontStyle]
                      .fontWeight
                  }
                  $color={
                    settings.theme.typography[props.header.title.fontStyle]
                      .color
                  }
                  $lineHeight={1}
                >
                  {currentPlan.name}
                </Text>
              </Box>

              {props.header.description.isVisible &&
                currentPlan.description && (
                  <Text
                    $font={
                      settings.theme.typography[
                        props.header.description.fontStyle
                      ].fontFamily
                    }
                    $size={
                      settings.theme.typography[
                        props.header.description.fontStyle
                      ].fontSize
                    }
                    $weight={
                      settings.theme.typography[
                        props.header.description.fontStyle
                      ].fontWeight
                    }
                    $color={
                      settings.theme.typography[
                        props.header.description.fontStyle
                      ].color
                    }
                  >
                    {currentPlan.description}
                  </Text>
                )}
            </div>

            {props.header.price.isVisible &&
              currentPlan.planPrice! >= 0 &&
              currentPlan.planPeriod && (
                <Text
                  $font={
                    settings.theme.typography[props.header.price.fontStyle]
                      .fontFamily
                  }
                  $size={
                    settings.theme.typography[props.header.price.fontStyle]
                      .fontSize
                  }
                  $weight={
                    settings.theme.typography[props.header.price.fontStyle]
                      .fontWeight
                  }
                  $color={
                    settings.theme.typography[props.header.price.fontStyle]
                      .color
                  }
                >
                  ${currentPlan.planPrice}/{currentPlan.planPeriod}
                </Text>
              )}
          </Flex>
        )}
      </Flex>

      {canChangePlan && props.callToAction.isVisible && (
        <StyledButton
          onClick={() => {
            setLayout("checkout");
          }}
          $size={props.callToAction.buttonSize}
          $color={props.callToAction.buttonStyle}
        >
          <Text
            $font={settings.theme.typography.text.fontFamily}
            $size={settings.theme.typography.text.fontSize}
            $weight={settings.theme.typography.text.fontWeight}
          >
            Change Plan
          </Text>
        </StyledButton>
      )}

      {canChangePlan &&
        layout === "checkout" &&
        createPortal(
          <OverlayWrapper>
            <OverlayHeader>
              <Flex $gap="1rem">
                <Flex $flexDirection="row" $gap="0.5rem" $alignItems="center">
                  <Box
                    $width="15px"
                    $height="15px"
                    $border="2px solid #DDDDDD"
                    $borderRadius="999px"
                    $backgroundColor="white"
                  />
                  <div
                    {...(checkoutStage === "plan" && {
                      style: {
                        fontWeight: "700",
                      },
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
                    {...(checkoutStage === "checkout" && {
                      style: {
                        fontWeight: "700",
                      },
                    })}
                  >
                    2. Checkout
                  </div>
                  <Icon
                    name="chevron-right"
                    style={{ fontSize: 16, color: "#D0D0D0" }}
                  />
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
                    <Flex
                      $flexDirection="column"
                      $gap="1rem"
                      $marginBottom="1rem"
                    >
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

                    <Flex
                      $flexDirection="row"
                      $gap="1rem"
                      $flex="1"
                      $height="100%"
                    >
                      {availablePlans?.map((plan) => {
                        return (
                          <Flex
                            $height="100%"
                            $flexDirection="column"
                            $backgroundColor="white"
                            $border={plan?.current ? `2px solid #194BFB` : ""}
                            $flex="1"
                            $borderRadius=".5rem"
                            $boxShadow="0px 1px 3px rgba(16, 24, 40, 0.1), 0px 1px 20px rgba(16, 24, 40, 0.06)"
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
                              <Text $size={20} $weight={600}>
                                {plan?.name}
                              </Text>
                              <Text $size={14}>{plan?.description}</Text>
                              <Text>
                                <Box $display="inline-block" $fontSize=".90rem">
                                  $
                                </Box>
                                <Box $display="inline-block" $fontSize="1.5rem">
                                  {plan?.price ? plan.price : "350"}
                                </Box>
                                <Box $display="inline-block" $fontSize=".75rem">
                                  /{planPeriod}
                                </Box>
                              </Text>
                              {plan?.current && (
                                <Flex
                                  $position="absolute"
                                  $right="1rem"
                                  $top="1rem"
                                  $fontSize=".75rem"
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
                              {[{}, {}, {}].map(() => {
                                return (
                                  <Flex $flexShrink="0" $gap="1rem">
                                    <IconRound
                                      name="server-search"
                                      size="tn"
                                      colors={["#00000", "#F5F5F5"]}
                                    />

                                    <Flex $alignItems="center">
                                      <Text $size=".75rem" $color="#00000">
                                        5 Queries/mo
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
                              {plan.current ? (
                                <Flex
                                  $flexDirection="row"
                                  $gap=".5rem"
                                  $justifyContent="center"
                                  $alignItems="center"
                                >
                                  <Icon
                                    name="check-rounded"
                                    style={{
                                      fontSize: 24,
                                      lineHeight: "1em",
                                      color: "#194BFB",
                                    }}
                                  />

                                  <span
                                    style={{
                                      fontSize: "1rem",
                                      color: "#7B7B7B",
                                    }}
                                  >
                                    Selected
                                  </span>
                                </Flex>
                              ) : (
                                <StyledButton
                                  $size="sm"
                                  $color="secondary"
                                  $variant="outline"
                                  onClick={() => {}}
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

                {checkoutStage === "checkout" && <CheckoutForm />}
              </Flex>

              <OverlaySideBar
                pricePeriod={planPeriod}
                setPricePeriod={setPlanPeriod}
                setCheckoutStage={setCheckoutStage}
              />
            </Flex>
          </OverlayWrapper>,
          portal || document.body,
        )}
    </div>
  );
});
