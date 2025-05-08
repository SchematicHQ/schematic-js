import { forwardRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components";

import { BillingPriceView } from "../../../api/checkoutexternal";
import { TEXT_BASE_SIZE, VISIBLE_ENTITLEMENT_COUNT } from "../../../const";
import { type FontStyle } from "../../../context";
import {
  useAvailablePlans,
  useEmbed,
  useIsLightBackground,
  useTrialEnd,
} from "../../../hooks";
import type { ElementProps, RecursivePartial } from "../../../types";
import {
  darken,
  formatCurrency,
  formatNumber,
  getBillingPrice,
  getFeatureName,
  hexToHSL,
  lighten,
  shortenPeriod,
} from "../../../utils";
import { cardBoxShadow, FussyChild } from "../../layout";
import { PeriodToggle } from "../../shared";
import {
  Box,
  Button,
  Flex,
  Icon,
  type IconNameTypes,
  IconRound,
  Text,
  Tooltip,
} from "../../ui";
import { ButtonLink } from "./styles";

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
  const props = resolveDesignProps(rest);

  const { t } = useTranslation();

  const theme = useTheme();

  const { data, setLayout, setSelected } = useEmbed();

  const trialEndDays = useTrialEnd();

  const [selectedPeriod, setSelectedPeriod] = useState(
    () => data.company?.plan?.planPeriod || "month",
  );

  const { plans, addOns, periods } = useAvailablePlans(selectedPeriod);

  const isLightBackground = useIsLightBackground();

  const [entitlementCounts, setEntitlementCounts] = useState(() =>
    plans.reduce(
      (
        acc: Record<
          string,
          {
            size: number;
            limit: number;
          }
        >,
        plan,
      ) => {
        acc[plan.id] = {
          size: plan.entitlements.length,
          limit: VISIBLE_ENTITLEMENT_COUNT,
        };

        return acc;
      },
      {},
    ),
  );

  const canCheckout = data.capabilities?.checkout ?? true;

  const cardPadding = theme.card.padding / TEXT_BASE_SIZE;

  const currentPlanIndex = plans.findIndex((plan) => plan.current);

  const handleToggleShowAll = (id: string) => {
    setEntitlementCounts((prev) => {
      const count = { ...prev[id] };
      return {
        ...prev,
        [id]: {
          size: count.size,
          limit:
            count.limit > VISIBLE_ENTITLEMENT_COUNT
              ? VISIBLE_ENTITLEMENT_COUNT
              : count.size,
        },
      };
    });
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

          {props.showPeriodToggle && periods.length > 1 && (
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
            {plans.map((plan, planIndex, self) => {
              const isActivePlan =
                plan.current &&
                data.company?.plan?.planPeriod === selectedPeriod;
              const { price: planPrice, currency: planCurrency } =
                getBillingPrice(
                  selectedPeriod === "year"
                    ? plan.yearlyPrice
                    : plan.monthlyPrice,
                ) || {};
              const count = entitlementCounts[plan.id];
              const isExpanded = count.limit > VISIBLE_ENTITLEMENT_COUNT;

              const hasUsageBasedEntitlements = plan.entitlements.some(
                (entitlement) => !!entitlement.priceBehavior,
              );
              const isUsageBasedPlan =
                planPrice === 0 && hasUsageBasedEntitlements;
              const headerPriceFontStyle =
                plan.custom || isUsageBasedPlan
                  ? theme.typography.heading3
                  : theme.typography[props.plans.name.fontStyle];

              return (
                <Flex
                  key={planIndex}
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
                    $borderWidth={0}
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
                        $font={headerPriceFontStyle.fontFamily}
                        $size={headerPriceFontStyle.fontSize}
                        $weight={headerPriceFontStyle.fontWeight}
                        $color={headerPriceFontStyle.color}
                      >
                        {plan.custom
                          ? plan.customPlanConfig?.priceText
                            ? plan.customPlanConfig.priceText
                            : t("Custom price")
                          : isUsageBasedPlan
                            ? t("Usage-based")
                            : formatCurrency(planPrice ?? 0, planCurrency)}
                      </Text>

                      {!plan.custom && !isUsageBasedPlan && (
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
                      )}
                    </Box>

                    {isActivePlan && (
                      <Flex
                        $position="absolute"
                        $right="1rem"
                        $top="1rem"
                        $backgroundColor={theme.primary}
                        $borderRadius="9999px"
                        $padding="0.125rem 0.85rem"
                      >
                        <Text
                          $font={theme.typography.text.fontFamily}
                          $size={0.75 * theme.typography.text.fontSize}
                          $weight={theme.typography.text.fontWeight}
                          $color={
                            hexToHSL(theme.primary).l > 50
                              ? "#000000"
                              : "#FFFFFF"
                          }
                        >
                          {trialEndDays
                            ? t("Trial ends in", { days: trialEndDays })
                            : t("Active")}
                        </Text>
                      </Flex>
                    )}
                  </Flex>

                  <Flex
                    $flexDirection="column"
                    $justifyContent="end"
                    $flexGrow={1}
                    $gap={`${cardPadding}rem`}
                    $padding={`${0.75 * cardPadding}rem ${cardPadding}rem 0`}
                  >
                    {props.plans.showEntitlements && (
                      <Flex $flexDirection="column" $gap="1rem" $flexGrow={1}>
                        {props.plans.showInclusionText && planIndex > 0 && (
                          <Box $marginBottom="1.5rem">
                            <Text
                              $font={theme.typography.text.fontFamily}
                              $size={theme.typography.text.fontSize}
                              $weight={theme.typography.text.fontWeight}
                              $color={theme.typography.text.color}
                            >
                              {t("Everything in", {
                                plan: self[planIndex - 1].name,
                              })}
                            </Text>
                          </Box>
                        )}

                        {plan.entitlements
                          .reduce(
                            (
                              acc: React.ReactElement[],
                              entitlement,
                              entitlementIndex,
                            ) => {
                              const limit =
                                entitlement.softLimit ??
                                entitlement.valueNumeric;

                              let entitlementPriceObject:
                                | undefined
                                | BillingPriceView;
                              if (selectedPeriod === "month") {
                                entitlementPriceObject =
                                  entitlement.meteredMonthlyPrice;
                              } else if (selectedPeriod === "year") {
                                entitlementPriceObject =
                                  entitlement.meteredYearlyPrice;
                              }

                              let entitlementPrice: undefined | number;
                              let entitlementCurrency: undefined | string;

                              if (entitlementPriceObject) {
                                entitlementPrice =
                                  entitlementPriceObject?.price;
                                entitlementCurrency =
                                  entitlementPriceObject?.currency;
                              }

                              if (
                                entitlementPriceObject &&
                                entitlement.priceBehavior === "overage"
                              ) {
                                if (
                                  entitlementPriceObject.priceTier?.length > 1
                                ) {
                                  // overage price is the last item in the price tier array
                                  const overagePrice =
                                    entitlementPriceObject.priceTier[
                                      entitlementPriceObject.priceTier.length -
                                        1
                                    ];
                                  entitlementPrice =
                                    overagePrice.perUnitPriceDecimal
                                      ? Number(overagePrice.perUnitPriceDecimal)
                                      : (overagePrice.perUnitPrice ?? 0);
                                  entitlementCurrency =
                                    entitlementPriceObject.currency;
                                }
                              }

                              if (
                                entitlement.priceBehavior &&
                                typeof entitlementPrice !== "number"
                              ) {
                                return acc;
                              }

                              const entitlementPackageSize =
                                entitlementPriceObject?.packageSize ?? 1;

                              acc.push(
                                <Flex key={entitlementIndex} $gap="1rem">
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
                                    <Flex
                                      $flexDirection="column"
                                      $justifyContent="center"
                                      $gap="0.5rem"
                                    >
                                      <Text
                                        $font={theme.typography.text.fontFamily}
                                        $size={theme.typography.text.fontSize}
                                        $weight={
                                          theme.typography.text.fontWeight
                                        }
                                        $color={theme.typography.text.color}
                                        $leading={1.35}
                                      >
                                        {typeof entitlementPrice === "number" &&
                                        (entitlement.priceBehavior ===
                                          "pay_in_advance" ||
                                          entitlement.priceBehavior ===
                                            "pay_as_you_go") ? (
                                          <>
                                            {formatCurrency(
                                              entitlementPrice,
                                              entitlementCurrency,
                                            )}{" "}
                                            {t("per")}{" "}
                                            {entitlementPackageSize > 1 && (
                                              <>{entitlementPackageSize} </>
                                            )}
                                            {getFeatureName(
                                              entitlement.feature,
                                              entitlementPackageSize,
                                            )}
                                            {entitlement.priceBehavior ===
                                              "pay_in_advance" && (
                                              <>
                                                {" "}
                                                {t("per")} {selectedPeriod}
                                              </>
                                            )}
                                          </>
                                        ) : entitlement.valueType ===
                                            "numeric" ||
                                          entitlement.valueType ===
                                            "unlimited" ||
                                          entitlement.valueType === "trait" ? (
                                          <>
                                            {entitlement.valueType ===
                                              "unlimited" &&
                                            !entitlement.priceBehavior
                                              ? t("Unlimited", {
                                                  item: getFeatureName(
                                                    entitlement.feature,
                                                  ),
                                                })
                                              : typeof limit === "number" && (
                                                  <>
                                                    {formatNumber(limit)}{" "}
                                                    {getFeatureName(
                                                      entitlement.feature,
                                                      limit,
                                                    )}
                                                  </>
                                                )}

                                            {entitlement.metricPeriod &&
                                            entitlement.priceBehavior !==
                                              "overage" ? (
                                              <>
                                                {" "}
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
                                            ) : (
                                              entitlement.priceBehavior ===
                                                "overage" &&
                                              entitlement.feature
                                                .featureType === "event" && (
                                                <>
                                                  /
                                                  {shortenPeriod(
                                                    selectedPeriod,
                                                  )}
                                                </>
                                              )
                                            )}
                                          </>
                                        ) : (
                                          entitlement.feature.name
                                        )}
                                      </Text>

                                      {entitlement.priceBehavior ===
                                        "overage" &&
                                        typeof entitlementPrice ===
                                          "number" && (
                                          <Text
                                            $font={
                                              theme.typography.text.fontFamily
                                            }
                                            $size={
                                              0.875 *
                                              theme.typography.text.fontSize
                                            }
                                            $weight={
                                              theme.typography.text.fontWeight
                                            }
                                            $color={
                                              hexToHSL(
                                                theme.typography.text.color,
                                              ).l > 50
                                                ? darken(
                                                    theme.typography.text.color,
                                                    0.46,
                                                  )
                                                : lighten(
                                                    theme.typography.text.color,
                                                    0.46,
                                                  )
                                            }
                                            $leading={1.35}
                                          >
                                            {formatCurrency(
                                              entitlementPrice,
                                              entitlementCurrency,
                                            )}
                                            /
                                            {entitlementPackageSize > 1 && (
                                              <>{entitlementPackageSize} </>
                                            )}
                                            {getFeatureName(
                                              entitlement.feature,
                                              entitlementPackageSize,
                                            )}
                                            {entitlement.feature.featureType ===
                                              "trait" && (
                                              <>
                                                /{shortenPeriod(selectedPeriod)}
                                              </>
                                            )}{" "}
                                            {t("overage fee")}
                                          </Text>
                                        )}
                                    </Flex>
                                  )}
                                </Flex>,
                              );

                              return acc;
                            },
                            [],
                          )
                          .slice(0, count?.limit ?? VISIBLE_ENTITLEMENT_COUNT)}

                        {(count?.size || plan.entitlements.length) >
                          VISIBLE_ENTITLEMENT_COUNT && (
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
                              onClick={() => handleToggleShowAll(plan.id)}
                              $font={theme.typography.link.fontFamily}
                              $size={theme.typography.link.fontSize}
                              $weight={theme.typography.link.fontWeight}
                              $color={theme.typography.link.color}
                              $leading={1}
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
                          $font={theme.typography.text.fontFamily}
                          $size={15}
                          $weight={theme.typography.text.fontWeight}
                          $color={theme.typography.text.color}
                          $leading={1}
                        >
                          {t("Current plan")}
                        </Text>
                      </Flex>
                    ) : (
                      (props.upgrade.isVisible ||
                        props.downgrade.isVisible) && (
                        <Button
                          type="button"
                          disabled={
                            (!plan.valid || !canCheckout) && !plan.custom
                          }
                          {...(!plan.custom && {
                            onClick: () => {
                              setSelected({
                                period: selectedPeriod,
                                planId: isActivePlan ? null : plan.id,
                                usage: false,
                              });
                              setLayout("checkout");
                            },
                          })}
                          {...(planIndex > currentPlanIndex
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
                          {plan.custom ? (
                            <ButtonLink
                              href={plan.customPlanConfig?.ctaWebSite ?? "#"}
                              target="_blank"
                            >
                              {plan.customPlanConfig?.ctaText ??
                                t("Talk to support")}
                            </ButtonLink>
                          ) : !plan.valid ? (
                            <Tooltip
                              trigger={t("Over usage limit")}
                              content={t(
                                "Current usage exceeds the limit of this plan.",
                              )}
                            />
                          ) : plan.companyCanTrial ? (
                            t("Start X day trial", { days: plan.trialDays })
                          ) : (
                            t("Choose plan")
                          )}
                        </Button>
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
              {addOns.map((addOn, addOnIndex) => {
                const isActiveAddOn =
                  addOn.current &&
                  selectedPeriod ===
                    data.company?.addOns.find((a) => a.id === addOn.id)
                      ?.planPeriod;
                const { price: addOnPrice, currency: addOnCurrency } =
                  getBillingPrice(
                    selectedPeriod === "year"
                      ? addOn.yearlyPrice
                      : addOn.monthlyPrice,
                  ) || {};

                return (
                  <Flex
                    key={addOnIndex}
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
                          {formatCurrency(addOnPrice ?? 0, addOnCurrency)}
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
                          $backgroundColor={theme.primary}
                          $borderRadius="9999px"
                          $padding="0.125rem 0.85rem"
                        >
                          <Text
                            $font={theme.typography.text.fontFamily}
                            $size={0.75 * theme.typography.text.fontSize}
                            $weight={theme.typography.text.fontWeight}
                            $color={
                              hexToHSL(theme.primary).l > 50
                                ? "#000000"
                                : "#FFFFFF"
                            }
                          >
                            {t("Active")}
                          </Text>
                        </Flex>
                      )}
                    </Flex>

                    <Flex
                      $flexDirection="column"
                      $justifyContent="end"
                      $gap={`${cardPadding}rem`}
                      $flexGrow={1}
                    >
                      {props.addOns.showEntitlements && (
                        <Flex
                          $flexDirection="column"
                          $position="relative"
                          $gap="1rem"
                          $flexGrow={1}
                        >
                          {addOn.entitlements.map(
                            (entitlement, entitlementIndex) => {
                              return (
                                <Flex
                                  key={entitlementIndex}
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
                                          $font={
                                            theme.typography.text.fontFamily
                                          }
                                          $size={theme.typography.text.fontSize}
                                          $weight={
                                            theme.typography.text.fontWeight
                                          }
                                          $color={theme.typography.text.color}
                                        >
                                          {entitlement.valueType ===
                                            "numeric" ||
                                          entitlement.valueType ===
                                            "unlimited" ||
                                          entitlement.valueType === "trait" ? (
                                            <>
                                              {entitlement.valueType ===
                                              "unlimited"
                                                ? t("Unlimited", {
                                                    item: getFeatureName(
                                                      entitlement.feature,
                                                    ),
                                                  })
                                                : typeof entitlement.valueNumeric ===
                                                    "number" && (
                                                    <>
                                                      {formatNumber(
                                                        entitlement.valueNumeric,
                                                      )}{" "}
                                                      {getFeatureName(
                                                        entitlement.feature,
                                                        entitlement.valueNumeric,
                                                      )}
                                                    </>
                                                  )}
                                              {entitlement.metricPeriod && (
                                                <>
                                                  {" "}
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
                            },
                          )}
                        </Flex>
                      )}

                      {props.upgrade.isVisible && (
                        <Button
                          type="button"
                          disabled={!addOn.valid || !canCheckout}
                          onClick={() => {
                            setSelected({
                              period: selectedPeriod,
                              addOnId: isActiveAddOn ? null : addOn.id,
                              usage: false,
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
                        </Button>
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
