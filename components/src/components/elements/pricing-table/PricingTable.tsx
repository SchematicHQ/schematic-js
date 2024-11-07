import { forwardRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "styled-components";
import pluralize from "pluralize";
import { TEXT_BASE_SIZE } from "../../../const";
import { type FontStyle } from "../../../context";
import {
  useAvailablePlans,
  useEmbed,
  useIsLightBackground,
} from "../../../hooks";
import type { ElementProps, RecursivePartial } from "../../../types";
import { formatCurrency, formatNumber, hexToHSL } from "../../../utils";
import { cardBoxShadow, FussyChild } from "../../layout";
import { CheckoutDialog, PeriodToggle, Savings } from "../../shared";
import {
  Box,
  Flex,
  EmbedButton,
  Icon,
  IconRound,
  Text,
  Tooltip,
  type IconNameTypes,
} from "../../ui";

interface DesignProps {
  showPeriodToggle: boolean;
  showDiscount: boolean;
  header: {
    isVisible: boolean;
    fontStyle: FontStyle;
  };
  plans: {
    isVisible: boolean;
    name: {
      fontStyle: FontStyle;
    };
    description: {
      isVisible: boolean;
      fontStyle: FontStyle;
    };
    showInclusionText: boolean;
    showFeatureIcons: boolean;
    showEntitlements: boolean;
  };
  addOns: {
    isVisible: boolean;
    showDescription: boolean;
    showFeatureIcons: boolean;
    showEntitlements: boolean;
  };
  upgrade: {
    isVisible: boolean;
    buttonSize: "sm" | "md" | "lg";
    buttonStyle: "primary" | "secondary";
  };
  downgrade: {
    isVisible: boolean;
    buttonSize: "sm" | "md" | "lg";
    buttonStyle: "primary" | "secondary";
  };
}

const resolveDesignProps = (
  props: RecursivePartial<DesignProps>,
): DesignProps => {
  return {
    showPeriodToggle: props.showPeriodToggle ?? true,
    showDiscount: props.showDiscount ?? true,
    header: {
      isVisible: props.header?.isVisible ?? true,
      fontStyle: props.header?.fontStyle ?? "heading3",
    },
    plans: {
      isVisible: props.plans?.isVisible ?? true,
      name: {
        fontStyle: props.plans?.name?.fontStyle ?? "heading2",
      },
      description: {
        isVisible: props.plans?.description?.isVisible ?? true,
        fontStyle: props.plans?.description?.fontStyle ?? "text",
      },
      showInclusionText: props.plans?.showInclusionText ?? true,
      showFeatureIcons: props.plans?.showFeatureIcons ?? true,
      showEntitlements: props.plans?.showEntitlements ?? true,
    },
    addOns: {
      isVisible: props.addOns?.isVisible ?? true,
      showDescription: props.addOns?.showDescription ?? true,
      showFeatureIcons: props.addOns?.showFeatureIcons ?? true,
      showEntitlements: props.addOns?.showEntitlements ?? true,
    },
    upgrade: {
      isVisible: props.upgrade?.isVisible ?? true,
      buttonSize: props.upgrade?.buttonSize ?? "sm",
      buttonStyle: props.upgrade?.buttonStyle ?? "primary",
    },
    downgrade: {
      isVisible: props.downgrade?.isVisible ?? true,
      buttonSize: props.downgrade?.buttonSize ?? "sm",
      buttonStyle: props.downgrade?.buttonStyle ?? "primary",
    },
  };
};

export type PricingTableProps = DesignProps;

export const PricingTable = forwardRef<
  HTMLDivElement | null,
  ElementProps &
    RecursivePartial<DesignProps> &
    React.HTMLAttributes<HTMLDivElement> & {
      portal?: HTMLElement | null;
    }
>(({ children, className, portal, ...rest }, ref) => {
  const props = resolveDesignProps(rest);

  const theme = useTheme();

  const { data, layout, setLayout } = useEmbed();

  const [selectedPeriod, setSelectedPeriod] = useState(
    () => data.company?.plan?.planPeriod || "month",
  );
  const [selectedPlanId, setSelectedPlanId] = useState<string | undefined>();
  const [selectedAddOnId, setSelectedAddOnId] = useState<string | undefined>();

  const { plans, addOns, periods } = useAvailablePlans(selectedPeriod);

  const isLightBackground = useIsLightBackground();

  const canChangePlan = data.capabilities?.checkout ?? true;

  const cardPadding = theme.card.padding / TEXT_BASE_SIZE;

  const plansByPrice = plans.slice().sort((a, b) => {
    if (selectedPeriod === "year") {
      return (a.yearlyPrice?.price ?? 0) - (b.yearlyPrice?.price ?? 0);
    }

    if (selectedPeriod === "month") {
      return (a.monthlyPrice?.price ?? 0) - (b.monthlyPrice?.price ?? 0);
    }

    return 0;
  });

  const currentPlanIndex = plansByPrice.findIndex((plan) => plan.current);
  const currentPlan = plansByPrice[currentPlanIndex];

  return (
    <FussyChild
      ref={ref}
      className={className}
      as={Flex}
      $flexDirection="column"
      $gap="3rem"
    >
      <Box>
        <Flex
          $justifyContent="space-between"
          $alignItems="center"
          $marginBottom="2rem"
        >
          <Text
            $font={theme.typography[props.header.fontStyle].fontFamily}
            $size={theme.typography[props.header.fontStyle].fontSize}
            $weight={theme.typography[props.header.fontStyle].fontWeight}
            $color={theme.typography[props.header.fontStyle].color}
          >
            {props.header.isVisible &&
              props.plans.isVisible &&
              plansByPrice.length > 0 &&
              "Plans"}
          </Text>

          <Flex $alignItems="center" $gap="1rem">
            {props.showDiscount && (
              <Savings plan={currentPlan} period={selectedPeriod} />
            )}

            {props.showPeriodToggle && (
              <PeriodToggle
                options={periods}
                selectedOption={selectedPeriod}
                onChange={(period) => setSelectedPeriod(period)}
              />
            )}
          </Flex>
        </Flex>

        {props.plans.isVisible && plansByPrice.length > 0 && (
          <Flex $flexWrap="wrap" $gap="1rem">
            {plansByPrice.map((plan, index, self) => {
              return (
                <Flex
                  key={index}
                  $flexDirection="column"
                  $width="100%"
                  $maxWidth="320px"
                  $padding={`${cardPadding}rem 0`}
                  $backgroundColor={theme.card.background}
                  $borderRadius={`${theme.card.borderRadius / TEXT_BASE_SIZE}rem`}
                  $outlineWidth="2px"
                  $outlineStyle="solid"
                  $outlineColor={plan.current ? theme.primary : "transparent"}
                  {...(theme.card.hasShadow && { $boxShadow: cardBoxShadow })}
                >
                  <Flex
                    $flexDirection="column"
                    $position="relative"
                    $gap="0.75rem"
                    $width="100%"
                    $height="auto"
                    $padding={`0 ${cardPadding}rem ${0.75 * cardPadding}rem`}
                    $borderBottomWidth="1px"
                    $borderStyle="solid"
                    $borderColor={
                      isLightBackground
                        ? "hsla(0, 0%, 0%, 0.175)"
                        : "hsla(0, 0%, 100%, 0.175)"
                    }
                  >
                    <Box>
                      <Text
                        $font={
                          theme.typography[props.plans.name.fontStyle]
                            .fontFamily
                        }
                        $size={
                          theme.typography[props.plans.name.fontStyle].fontSize
                        }
                        $weight={
                          theme.typography[props.plans.name.fontStyle]
                            .fontWeight
                        }
                        $color={
                          theme.typography[props.plans.name.fontStyle].color
                        }
                      >
                        {plan.name}
                      </Text>
                    </Box>

                    {props.plans.description.isVisible && (
                      <Box $marginBottom="0.5rem">
                        <Text
                          $font={
                            theme.typography[props.plans.description.fontStyle]
                              .fontFamily
                          }
                          $size={
                            theme.typography[props.plans.description.fontStyle]
                              .fontSize
                          }
                          $weight={
                            theme.typography[props.plans.description.fontStyle]
                              .fontWeight
                          }
                          $color={
                            theme.typography[props.plans.description.fontStyle]
                              .color
                          }
                        >
                          {plan.description}
                        </Text>
                      </Box>
                    )}

                    <Box>
                      <Text
                        $font={
                          theme.typography[props.plans.name.fontStyle]
                            .fontFamily
                        }
                        $size={
                          theme.typography[props.plans.name.fontStyle].fontSize
                        }
                        $weight={
                          theme.typography[props.plans.name.fontStyle]
                            .fontWeight
                        }
                        $color={
                          theme.typography[props.plans.name.fontStyle].color
                        }
                      >
                        {formatCurrency(
                          (selectedPeriod === "month"
                            ? plan.monthlyPrice
                            : plan.yearlyPrice
                          )?.price ?? 0,
                        )}
                      </Text>

                      <Text
                        $font={
                          theme.typography[props.plans.name.fontStyle]
                            .fontFamily
                        }
                        $size={
                          (16 / 30) *
                          theme.typography[props.plans.name.fontStyle].fontSize
                        }
                        $weight={
                          theme.typography[props.plans.name.fontStyle]
                            .fontWeight
                        }
                        $color={
                          theme.typography[props.plans.name.fontStyle].color
                        }
                      >
                        /{selectedPeriod}
                      </Text>
                    </Box>

                    {plan.current && (
                      <Flex
                        $position="absolute"
                        $right="1rem"
                        $top="1rem"
                        $fontSize="0.625rem"
                        $color={
                          hexToHSL(theme.primary).l > 50 ? "#000000" : "#FFFFFF"
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
                    $justifyContent="end"
                    $flexGrow="1"
                    $gap={`${cardPadding}rem`}
                    $padding={`${0.75 * cardPadding}rem ${cardPadding}rem 0`}
                  >
                    {props.plans.showEntitlements && (
                      <Flex
                        $flexDirection="column"
                        $position="relative"
                        $gap="0.5rem"
                        $flexGrow="1"
                      >
                        {props.plans.showInclusionText && index > 0 && (
                          <Box $marginBottom="1.5rem">
                            <Text
                              $font={theme.typography.text.fontFamily}
                              $size={theme.typography.text.fontSize}
                              $weight={theme.typography.text.fontWeight}
                              $color={theme.typography.text.color}
                            >
                              Everything in ${self[index - 1].name}, plus
                            </Text>
                          </Box>
                        )}

                        {plan.entitlements.map((entitlement) => {
                          return (
                            <Flex key={entitlement.id} $gap="1rem">
                              {props.plans.showFeatureIcons &&
                                entitlement.feature?.icon && (
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

                              {entitlement.feature?.name && (
                                <Flex $alignItems="center">
                                  <Text
                                    $font={theme.typography.text.fontFamily}
                                    $size={theme.typography.text.fontSize}
                                    $weight={theme.typography.text.fontWeight}
                                    $color={theme.typography.text.color}
                                  >
                                    {entitlement.valueType === "numeric" ||
                                    entitlement.valueType === "unlimited" ||
                                    entitlement.valueType === "trait" ? (
                                      <>
                                        {typeof entitlement.valueNumeric ===
                                        "number"
                                          ? `${formatNumber(entitlement.valueNumeric)} ${pluralize(entitlement.feature.name, entitlement.valueNumeric)}`
                                          : `Unlimited ${pluralize(entitlement.feature.name)}`}
                                        {entitlement.metricPeriod &&
                                          ` per ${
                                            {
                                              billing: "billing period",
                                              current_day: "day",
                                              current_month: "month",
                                              current_year: "year",
                                            }[entitlement.metricPeriod]
                                          }`}
                                      </>
                                    ) : (
                                      entitlement.feature.name
                                    )}
                                  </Text>
                                </Flex>
                              )}
                            </Flex>
                          );
                        })}
                      </Flex>
                    )}

                    {plan.current ? (
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
                    ) : (
                      <>
                        {((index > currentPlanIndex &&
                          props.upgrade.isVisible) ||
                          (index < currentPlanIndex &&
                            props.downgrade.isVisible)) && (
                          // plans are sorted by price, so we can determine grades by index
                          <Box $position="relative">
                            <EmbedButton
                              disabled={!plan.valid}
                              {...(plan.valid === true && {
                                onClick: () => {
                                  setSelectedPlanId(plan.id);
                                  setLayout("checkout");
                                },
                              })}
                              {...(index > currentPlanIndex
                                ? {
                                    $size: props.upgrade.buttonSize,
                                    $color: props.upgrade.buttonStyle,
                                    $variant: "filled",
                                  }
                                : {
                                    $size: props.downgrade.buttonSize,
                                    $color: props.downgrade.buttonStyle,
                                    $variant: "outline",
                                  })}
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
                        )}
                      </>
                    )}
                  </Flex>
                </Flex>
              );
            })}
          </Flex>
        )}
      </Box>

      <Box>
        {props.addOns.isVisible && addOns.length > 0 && (
          <>
            {props.header.isVisible && (
              <Flex
                $justifyContent="space-between"
                $alignItems="center"
                $marginBottom="2rem"
              >
                <Text
                  $font={theme.typography[props.header.fontStyle].fontFamily}
                  $size={theme.typography[props.header.fontStyle].fontSize}
                  $weight={theme.typography[props.header.fontStyle].fontWeight}
                  $color={theme.typography[props.header.fontStyle].color}
                >
                  Addons
                </Text>
              </Flex>
            )}

            <Flex $flexWrap="wrap" $gap="1rem">
              {addOns.map((addOn, index) => {
                return (
                  <Flex
                    key={index}
                    $flexDirection="column"
                    $gap="2rem"
                    $width="100%"
                    $maxWidth="320px"
                    $padding={`${cardPadding}rem`}
                    $backgroundColor={theme.card.background}
                    $borderRadius={`${theme.card.borderRadius / TEXT_BASE_SIZE}rem`}
                    $outlineWidth="2px"
                    $outlineStyle="solid"
                    $outlineColor={
                      addOn.current ? theme.primary : "transparent"
                    }
                    {...(theme.card.hasShadow && { $boxShadow: cardBoxShadow })}
                  >
                    <Flex
                      $flexDirection="column"
                      $position="relative"
                      $gap="0.75rem"
                      $width="100%"
                      $height="auto"
                    >
                      <Box>
                        <Text
                          $font={
                            theme.typography[props.plans.name.fontStyle]
                              .fontFamily
                          }
                          $size={
                            theme.typography[props.plans.name.fontStyle]
                              .fontSize
                          }
                          $weight={
                            theme.typography[props.plans.name.fontStyle]
                              .fontWeight
                          }
                          $color={
                            theme.typography[props.plans.name.fontStyle].color
                          }
                        >
                          {addOn.name}
                        </Text>
                      </Box>

                      {props.addOns.showDescription && (
                        <Box $marginBottom="0.5rem">
                          <Text
                            $font={
                              theme.typography[
                                props.plans.description.fontStyle
                              ].fontFamily
                            }
                            $size={
                              theme.typography[
                                props.plans.description.fontStyle
                              ].fontSize
                            }
                            $weight={
                              theme.typography[
                                props.plans.description.fontStyle
                              ].fontWeight
                            }
                            $color={
                              theme.typography[
                                props.plans.description.fontStyle
                              ].color
                            }
                          >
                            {addOn.description}
                          </Text>
                        </Box>
                      )}

                      <Box>
                        <Text
                          $font={
                            theme.typography[props.plans.name.fontStyle]
                              .fontFamily
                          }
                          $size={
                            theme.typography[props.plans.name.fontStyle]
                              .fontSize
                          }
                          $weight={
                            theme.typography[props.plans.name.fontStyle]
                              .fontWeight
                          }
                          $color={
                            theme.typography[props.plans.name.fontStyle].color
                          }
                        >
                          {formatCurrency(
                            (selectedPeriod === "month"
                              ? addOn.monthlyPrice
                              : addOn.yearlyPrice
                            )?.price ?? 0,
                          )}
                        </Text>

                        <Text
                          $font={
                            theme.typography[props.plans.name.fontStyle]
                              .fontFamily
                          }
                          $size={
                            (16 / 30) *
                            theme.typography[props.plans.name.fontStyle]
                              .fontSize
                          }
                          $weight={
                            theme.typography[props.plans.name.fontStyle]
                              .fontWeight
                          }
                          $color={
                            theme.typography[props.plans.name.fontStyle].color
                          }
                        >
                          /{selectedPeriod}
                        </Text>
                      </Box>

                      {addOn.current && (
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
                          Active
                        </Flex>
                      )}
                    </Flex>

                    <Flex
                      $flexDirection="column"
                      $justifyContent="end"
                      $gap={`${cardPadding}rem`}
                      $flexGrow="1"
                    >
                      {props.addOns.showEntitlements && (
                        <Flex
                          $flexDirection="column"
                          $position="relative"
                          $gap="0.5rem"
                          $flexGrow="1"
                        >
                          {addOn.entitlements.map((entitlement) => {
                            return (
                              <Flex
                                key={entitlement.id}
                                $flexWrap="wrap"
                                $justifyContent="space-between"
                                $alignItems="center"
                                $gap="1rem"
                              >
                                <Flex $gap="1rem">
                                  {props.addOns.showFeatureIcons &&
                                    entitlement.feature?.icon && (
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

                                  {entitlement.feature?.name && (
                                    <Flex $alignItems="center">
                                      <Text
                                        $font={theme.typography.text.fontFamily}
                                        $size={theme.typography.text.fontSize}
                                        $weight={
                                          theme.typography.text.fontWeight
                                        }
                                        $color={theme.typography.text.color}
                                      >
                                        {entitlement.valueType === "numeric" ||
                                        entitlement.valueType === "unlimited" ||
                                        entitlement.valueType === "trait" ? (
                                          <>
                                            {typeof entitlement.valueNumeric ===
                                            "number"
                                              ? `${formatNumber(entitlement.valueNumeric)} ${pluralize(entitlement.feature.name, entitlement.valueNumeric)}`
                                              : `Unlimited ${pluralize(entitlement.feature.name)}`}
                                            {entitlement.metricPeriod &&
                                              ` per ${
                                                {
                                                  billing: "billing period",
                                                  current_day: "day",
                                                  current_month: "month",
                                                  current_year: "year",
                                                }[entitlement.metricPeriod]
                                              }`}
                                          </>
                                        ) : (
                                          entitlement.feature.name
                                        )}
                                      </Text>
                                    </Flex>
                                  )}
                                </Flex>
                              </Flex>
                            );
                          })}
                        </Flex>
                      )}

                      {addOn.current ? (
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
                      ) : (
                        <>
                          {props.upgrade.isVisible && (
                            <Box $position="relative">
                              <EmbedButton
                                disabled={!addOn.valid}
                                {...(addOn.valid === true && {
                                  onClick: () => {
                                    setSelectedAddOnId(addOn.id);
                                    setLayout("checkout");
                                  },
                                })}
                                {...(index > currentPlanIndex
                                  ? // plans are sorted by price, so we can determine grades by index
                                    {
                                      $size: props.upgrade.buttonSize,
                                      $color: props.upgrade.buttonStyle,
                                      $variant: "filled",
                                    }
                                  : {
                                      $size: props.downgrade.buttonSize,
                                      $color: props.downgrade.buttonStyle,
                                      $variant: "outline",
                                    })}
                              >
                                Add
                              </EmbedButton>
                            </Box>
                          )}
                        </>
                      )}
                    </Flex>
                  </Flex>
                );
              })}
            </Flex>
          </>
        )}
      </Box>

      {canChangePlan &&
        layout === "checkout" &&
        createPortal(
          <CheckoutDialog
            initialPeriod={selectedPeriod}
            initialPlanId={selectedPlanId}
            initialAddOnId={selectedAddOnId}
          />,
          portal || document.body,
        )}
    </FussyChild>
  );
});
