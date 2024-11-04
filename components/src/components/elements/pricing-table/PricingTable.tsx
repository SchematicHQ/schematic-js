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
import { cardBoxShadow, FussyChild } from "../../layout";
import { CheckoutDialog, PeriodToggle } from "../../shared";
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
    : plans
        .filter(
          (plan) =>
            (period === "month" && plan.monthlyPrice) ||
            (period === "year" && plan.yearlyPrice),
        )
        .map((plan) => ({ ...plan, isSelected: false }));
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
      fontStyle: props.header?.fontStyle ?? "heading3",
    },
    plans: {
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

  const { data, layout, mode, setLayout } = useEmbed();

  const [period, setPeriod] = useState(() => data.company?.plan?.planPeriod);
  const [selectedPlanId, setSelectedPlanId] = useState<string | undefined>();

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
  }, [
    data.capabilities?.checkout,
    data.activePlans,
    data.activeAddOns,
    period,
    mode,
  ]);

  const isLightBackground = useIsLightBackground();

  const cardPadding = theme.card.padding / TEXT_BASE_SIZE;

  const plansByPrice = plans.slice().sort((a, b) => {
    if (period === "year") {
      return (a.yearlyPrice?.price ?? 0) - (b.yearlyPrice?.price ?? 0);
    }

    if (period === "month") {
      return (a.monthlyPrice?.price ?? 0) - (b.monthlyPrice?.price ?? 0);
    }

    return 0;
  });

  const currentPlanIndex = plansByPrice.findIndex(
    (plan) => plan.current === true,
  );

  return (
    <FussyChild ref={ref} className={className}>
      <Flex
        $justifyContent="space-between"
        $alignItems="center"
        $marginBottom="2rem"
      >
        {props.header.isVisible && (
          <Text
            $font={theme.typography[props.header.fontStyle].fontFamily}
            $size={theme.typography[props.header.fontStyle].fontSize}
            $weight={theme.typography[props.header.fontStyle].fontWeight}
            $color={theme.typography[props.header.fontStyle].color}
          >
            Plans
          </Text>
        )}

        <PeriodToggle
          period="month"
          changePeriod={(period) => console.debug(period)}
        />
      </Flex>

      <Flex $flexWrap="wrap" $gap="1rem">
        {plansByPrice.map((plan, index) => {
          return (
            <Flex
              key={index}
              $flexDirection="column"
              $width="100%"
              $maxWidth="320px"
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
                $gap="1rem"
                $width="100%"
                $height="auto"
                $padding={`${cardPadding}rem ${cardPadding}rem ${0.75 * cardPadding}rem`}
                $borderBottomWidth="1px"
                $borderStyle="solid"
                $borderColor={
                  isLightBackground
                    ? "hsla(0, 0%, 0%, 0.175)"
                    : "hsla(0, 0%, 100%, 0.175)"
                }
              >
                <Text
                  $font={
                    theme.typography[props.plans.name.fontStyle].fontFamily
                  }
                  $size={theme.typography[props.plans.name.fontStyle].fontSize}
                  $weight={
                    theme.typography[props.plans.name.fontStyle].fontWeight
                  }
                  $color={theme.typography[props.plans.name.fontStyle].color}
                >
                  {plan.name}
                </Text>

                <Text
                  $font={
                    theme.typography[props.plans.description.fontStyle]
                      .fontFamily
                  }
                  $size={
                    theme.typography[props.plans.description.fontStyle].fontSize
                  }
                  $weight={
                    theme.typography[props.plans.description.fontStyle]
                      .fontWeight
                  }
                  $color={
                    theme.typography[props.plans.description.fontStyle].color
                  }
                >
                  {plan.description}
                </Text>

                <Text
                  $font={theme.typography.text.fontFamily}
                  $size={theme.typography.text.fontSize}
                  $weight={theme.typography.text.fontWeight}
                  $color={theme.typography.text.color}
                >
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
                $justifyContent="space-between"
                $gap={`${cardPadding}rem`}
                $flexGrow="1"
                $padding={`${0.75 * cardPadding}rem ${cardPadding}rem ${cardPadding}rem`}
              >
                <Flex
                  $flexDirection="column"
                  $position="relative"
                  $gap="0.5rem"
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
              </Flex>
            </Flex>
          );
        })}
      </Flex>

      {canChangePlan &&
        layout === "checkout" &&
        createPortal(
          <CheckoutDialog initialPlanId={selectedPlanId} />,
          portal || document.body,
        )}
    </FussyChild>
  );
});
