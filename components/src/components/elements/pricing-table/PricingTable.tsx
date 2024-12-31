import { forwardRef, useState } from "react";
import { useTranslation } from "react-i18next";
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
import { PeriodToggle } from "../../shared";
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
      buttonSize: props.upgrade?.buttonSize ?? "md",
      buttonStyle: props.upgrade?.buttonStyle ?? "primary",
    },
    downgrade: {
      isVisible: props.downgrade?.isVisible ?? true,
      buttonSize: props.downgrade?.buttonSize ?? "md",
      buttonStyle: props.downgrade?.buttonStyle ?? "primary",
    },
  };
};

export type PricingTableProps = DesignProps;

export const PricingTable = forwardRef<
  HTMLDivElement | null,
  ElementProps &
    RecursivePartial<DesignProps> &
    React.HTMLAttributes<HTMLDivElement>
>(({ children, className, ...rest }, ref) => {
  const visibleCount = 4;
  const [showAll, setShowAll] = useState(visibleCount);
  const [isExpanded, setIsExpanded] = useState(false);

  const props = resolveDesignProps(rest);

  const { t } = useTranslation();

  const theme = useTheme();

  const { data, setLayout, setSelected } = useEmbed();

  const [selectedPeriod, setSelectedPeriod] = useState(
    () => data.company?.plan?.planPeriod || "month",
  );

  const { plans, addOns, periods } = useAvailablePlans(selectedPeriod);

  const isLightBackground = useIsLightBackground();

  const cardPadding = theme.card.padding / TEXT_BASE_SIZE;

  const currentPlanIndex = plans.findIndex((plan) => plan.current);

  const handleToggleShowAll = () => {
    if (isExpanded) {
      setShowAll(visibleCount);
      setIsExpanded(false);
    } else {
      setShowAll(plans.length);
      setIsExpanded(true);
    }
  };
  return (
    <FussyChild
      ref={ref}
      className={className}
      as={Flex}
      $flexDirection="column"
      $gap="2rem"
    >
      <Box>
        <Flex
          $flexDirection="column"
          $justifyContent="center"
          $alignItems="center"
          $gap="1rem"
          $marginBottom="1rem"
          $viewport={{
            md: {
              $flexDirection: "row",
              $justifyContent: "space-between",
            },
          }}
        >
          <Text
            $font={theme.typography[props.header.fontStyle].fontFamily}
            $size={theme.typography[props.header.fontStyle].fontSize}
            $weight={theme.typography[props.header.fontStyle].fontWeight}
            $color={theme.typography[props.header.fontStyle].color}
          >
            {props.header.isVisible &&
              props.plans.isVisible &&
              plans.length > 0 &&
              t("Plans")}
          </Text>

          {props.showPeriodToggle && (
            <PeriodToggle
              options={periods}
              selectedOption={selectedPeriod}
              onChange={(period) => setSelectedPeriod(period)}
            />
          )}
        </Flex>

        {props.plans.isVisible && plans.length > 0 && (
          <Box
            $display="grid"
            $gridTemplateColumns="repeat(auto-fill, minmax(320px, 1fr))"
            $gap="1rem"
          >
            {plans.map((plan, index, self) => {
              const isActivePlan =
                plan.current &&
                data.company?.plan?.planPeriod === selectedPeriod;

              return (
                <Flex
                  key={index}
                  $position="relative"
                  $flexDirection="column"
                  $padding={`${cardPadding}rem 0`}
                  $backgroundColor={theme.card.background}
                  $borderRadius={`${theme.card.borderRadius / TEXT_BASE_SIZE}rem`}
                  $outlineWidth="2px"
                  $outlineStyle="solid"
                  $outlineColor={isActivePlan ? theme.primary : "transparent"}
                  {...(theme.card.hasShadow && { $boxShadow: cardBoxShadow })}
                >
                  <Flex
                    $flexDirection="column"
                    $gap="0.75rem"
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

                    {isActivePlan && (
                      <Flex
                        $position="absolute"
                        $right="1rem"
                        $top="1rem"
                        $fontSize="0.75rem"
                        $color={
                          hexToHSL(theme.primary).l > 50 ? "#000000" : "#FFFFFF"
                        }
                        $backgroundColor={theme.primary}
                        $borderRadius="9999px"
                        $padding="0.125rem 0.85rem"
                      >
                        {t("Active")}
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
                      <Flex $flexDirection="column" $gap="1rem" $flexGrow="1">
                        {props.plans.showInclusionText && index > 0 && (
                          <Box $marginBottom="1.5rem">
                            <Text
                              $font={theme.typography.text.fontFamily}
                              $size={theme.typography.text.fontSize}
                              $weight={theme.typography.text.fontWeight}
                              $color={theme.typography.text.color}
                            >
                              {t("Everything in", {
                                plan: self[index - 1].name,
                              })}
                            </Text>
                          </Box>
                        )}

                        {plan.entitlements
                          .slice(0, showAll)
                          .map((entitlement) => {
                            return (
                              <Flex key={entitlement.id} $gap="1rem">
                                {props.plans.showFeatureIcons &&
                                  entitlement.feature?.icon && (
                                    <IconRound
                                      name={
                                        entitlement.feature.icon as
                                          | IconNameTypes
                                          | string
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
                                            : t("Unlimited", {
                                                item: pluralize(
                                                  entitlement.feature.name,
                                                ),
                                              })}
                                          {entitlement.metricPeriod && (
                                            <>
                                              {t("per")}{" "}
                                              {
                                                {
                                                  billing: "billing period",
                                                  current_day: "day",
                                                  current_month: "month",
                                                  current_year: "year",
                                                }[entitlement.metricPeriod]
                                              }
                                            </>
                                          )}
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

                        {plan.entitlements.length > 4 && (
                          <Flex
                            $alignItems="center"
                            $justifyContent="start"
                            $marginTop="1rem"
                          >
                            <Icon
                              name={isExpanded ? "chevron-up" : "chevron-down"}
                              style={{
                                fontSize: "1.4rem",
                                lineHeight: "1em",
                                marginRight: ".25rem",
                                color: "#D0D0D0",
                              }}
                            />
                            <Text
                              onClick={handleToggleShowAll}
                              $font={theme.typography.link.fontFamily}
                              $size={theme.typography.link.fontSize}
                              $weight={theme.typography.link.fontWeight}
                              $leading={1}
                              $color={theme.typography.link.color}
                              style={{ cursor: "pointer" }}
                            >
                              {isExpanded ? t("Hide all") : t("See all")}
                            </Text>
                          </Flex>
                        )}
                      </Flex>
                    )}

                    {isActivePlan ? (
                      <Flex
                        $justifyContent="center"
                        $alignItems="center"
                        $gap="0.25rem"
                        $padding="0.625rem 0"
                      >
                        <Icon
                          name="check-rounded"
                          style={{
                            fontSize: 20,
                            lineHeight: 1,
                            color: theme.primary,
                          }}
                        />

                        <Text
                          $size={15}
                          $leading={1}
                          $color={theme.typography.text.color}
                        >
                          {t("Current plan")}
                        </Text>
                      </Flex>
                    ) : (
                      (props.upgrade.isVisible ||
                        props.downgrade.isVisible) && (
                        <EmbedButton
                          disabled={!plan.valid}
                          onClick={() => {
                            setSelected({
                              period: selectedPeriod,
                              planId: isActivePlan ? null : plan.id,
                            });
                            setLayout("checkout");
                          }}
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
                          {!plan.valid ? (
                            <Tooltip
                              trigger={t("Over usage limit")}
                              content={t(
                                "Current usage exceeds the limit of this plan.",
                              )}
                            />
                          ) : (
                            t("Choose plan")
                          )}
                        </EmbedButton>
                      )
                    )}
                  </Flex>
                </Flex>
              );
            })}
          </Box>
        )}
      </Box>

      <Box>
        {props.addOns.isVisible && addOns.length > 0 && (
          <>
            {props.header.isVisible && (
              <Flex
                $justifyContent="space-between"
                $alignItems="center"
                $marginBottom="1rem"
              >
                <Text
                  $font={theme.typography[props.header.fontStyle].fontFamily}
                  $size={theme.typography[props.header.fontStyle].fontSize}
                  $weight={theme.typography[props.header.fontStyle].fontWeight}
                  $color={theme.typography[props.header.fontStyle].color}
                >
                  {t("Add-ons")}
                </Text>
              </Flex>
            )}

            <Box
              $display="grid"
              $gridTemplateColumns="repeat(auto-fill, minmax(320px, 1fr))"
              $gap="1rem"
            >
              {addOns.map((addOn, index) => {
                const isActiveAddOn =
                  addOn.current &&
                  selectedPeriod ===
                    data.company?.addOns.find((a) => a.id === addOn.id)
                      ?.planPeriod;

                return (
                  <Flex
                    key={index}
                    $position="relative"
                    $flexDirection="column"
                    $gap="2rem"
                    $padding={`${cardPadding}rem`}
                    $backgroundColor={theme.card.background}
                    $borderRadius={`${theme.card.borderRadius / TEXT_BASE_SIZE}rem`}
                    $outlineWidth="2px"
                    $outlineStyle="solid"
                    $outlineColor={
                      isActiveAddOn ? theme.primary : "transparent"
                    }
                    {...(theme.card.hasShadow && { $boxShadow: cardBoxShadow })}
                  >
                    <Flex $flexDirection="column" $gap="0.75rem">
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

                      {isActiveAddOn && (
                        <Flex
                          $position="absolute"
                          $right="1rem"
                          $top="1rem"
                          $fontSize="0.75rem"
                          $color={
                            hexToHSL(theme.primary).l > 50
                              ? "#000000"
                              : "#FFFFFF"
                          }
                          $backgroundColor={theme.primary}
                          $borderRadius="9999px"
                          $padding="0.125rem 0.85rem"
                        >
                          {t("Active")}
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
                          $gap="1rem"
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
                                          entitlement.feature.icon as
                                            | IconNameTypes
                                            | string
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
                                              : t("Unlimited", {
                                                  item: pluralize(
                                                    entitlement.feature.name,
                                                  ),
                                                })}
                                            {entitlement.metricPeriod && (
                                              <>
                                                {t("per")}{" "}
                                                {
                                                  {
                                                    billing: "billing period",
                                                    current_day: "day",
                                                    current_month: "month",
                                                    current_year: "year",
                                                  }[entitlement.metricPeriod]
                                                }
                                              </>
                                            )}
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

                      {props.upgrade.isVisible && (
                        <EmbedButton
                          disabled={!addOn.valid}
                          onClick={() => {
                            setSelected({
                              period: selectedPeriod,
                              addOnId: isActiveAddOn ? null : addOn.id,
                            });
                            setLayout("checkout");
                          }}
                          $size={props.upgrade.buttonSize}
                          $color={
                            isActiveAddOn ? "danger" : props.upgrade.buttonStyle
                          }
                          $variant={
                            isActiveAddOn
                              ? "ghost"
                              : addOn.current
                                ? "outline"
                                : "filled"
                          }
                        >
                          {isActiveAddOn
                            ? t("Remove add-on")
                            : addOn.current
                              ? t("Change add-on")
                              : t("Choose add-on")}
                        </EmbedButton>
                      )}
                    </Flex>
                  </Flex>
                );
              })}
            </Box>
          </>
        )}
      </Box>
    </FussyChild>
  );
});

PricingTable.displayName = "PricingTable";
