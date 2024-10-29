import { forwardRef, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "styled-components";
import pluralize from "pluralize";
import type {
  CompanyPlanWithBillingSubView,
  CompanyPlanDetailResponseData,
} from "../../../api";
import { TEXT_BASE_SIZE } from "../../../const";
import { type FontStyle } from "../../../context";
import { useEmbed, useIsLightBackground } from "../../../hooks";
import type { ElementProps, RecursivePartial } from "../../../types";
import { formatCurrency, formatNumber, hexToHSL } from "../../../utils";
import { CheckoutDialog } from "../../elements";
import { Element } from "../../layout";
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

const getActivePlans = (
  plans: CompanyPlanDetailResponseData[],
  period: CompanyPlanWithBillingSubView["planPeriod"],
  mode: string,
) => {
  return mode === "edit"
    ? plans
    : plans.filter(
        (plan) =>
          (period === "month" && plan.monthlyPrice) ||
          (period === "year" && plan.yearlyPrice),
      );
};

interface DesignProps {
  showPeriodToggle: boolean;
  showDiscount: boolean;
  header: {
    isVisible: boolean;
    fontStyle: FontStyle;
  };
  plans: {
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
      fontStyle: props.header?.fontStyle ?? "heading2",
    },
    plans: {
      name: {
        fontStyle: props.plans?.name?.fontStyle ?? "heading1",
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
      buttonStyle: props.downgrade?.buttonStyle ?? "secondary",
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

  const { data, layout, mode } = useEmbed();

  const [period, setPeriod] = useState(() => data.company?.plan?.planPeriod);

  const { canChangePlan, plans, addOns, periods } = useMemo(() => {
    const periods = [];
    if (data.activePlans.some((plan) => plan.monthlyPrice)) {
      periods.push("month");
    }
    if (data.activePlans.some((plan) => plan.yearlyPrice)) {
      periods.push("year");
    }

    return {
      canChangePlan: data.capabilities?.checkout ?? true,
      plans: getActivePlans(data.activePlans, period, mode),
      addOns: getActivePlans(data.activeAddOns, period, mode),
      periods,
    };
  }, [data.capabilities, data.activePlans, data.activeAddOns, period, mode]);

  const isLightBackground = useIsLightBackground();

  return (
    <Flex
      ref={ref}
      className={className}
      $flexWrap="wrap"
      $gap="1rem"
      $flexGrow="1"
    >
      {plans
        .sort((a, b) => {
          if (period === "year") {
            return (a.yearlyPrice?.price ?? 0) - (b.yearlyPrice?.price ?? 0);
          }

          if (period === "month") {
            return (a.monthlyPrice?.price ?? 0) - (b.monthlyPrice?.price ?? 0);
          }

          return 0;
        })
        .map((plan) => {
          return (
            <Element
              as={Flex}
              key={plan.id}
              $flexDirection="column"
              $width="100%"
              $minWidth="280px"
              $maxWidth={`calc(${100 / 3}% - 1rem)`}
              $backgroundColor={theme.card.background}
              $outlineWidth="2px"
              $outlineStyle="solid"
              $outlineColor={plan.current ? theme.primary : "transparent"}
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
                      (period === "month"
                        ? plan.monthlyPrice
                        : plan.yearlyPrice
                      )?.price ?? 0,
                    )}
                  </Box>

                  <Box $display="inline-block" $fontSize="0.75rem">
                    /{period}
                  </Box>
                </Text>

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
                            name={entitlement.feature.icon as IconNameTypes}
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
                                  {typeof entitlement.valueNumeric === "number"
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

              <Flex
                $flexDirection="column"
                $position="relative"
                $gap="1rem"
                $width="100%"
                $height="auto"
                $padding="1.5rem"
              >
                {!plan.current ? (
                  <Box $position="relative">
                    <EmbedButton
                      disabled={!plan.valid}
                      {...(plan.valid === true && {
                        // TODO
                        onClick: () => {
                          // selectPlan(plan);
                        },
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
            </Element>
          );
        })}

      {canChangePlan &&
        layout === "checkout" &&
        createPortal(<CheckoutDialog />, portal || document.body)}
    </Flex>
  );
});
