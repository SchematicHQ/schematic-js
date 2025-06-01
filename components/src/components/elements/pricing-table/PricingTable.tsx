import cx from "classnames";
import { Fragment, forwardRef, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  type BillingPriceView,
  type CompanyPlanDetailResponseData,
} from "../../../api/checkoutexternal";
import { type PlanViewPublicResponseData } from "../../../api/componentspublic";
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
  entitlementCountsReducer,
  formatCurrency,
  formatNumber,
  getBillingPrice,
  getFeatureName,
  hexToHSL,
  isCheckoutData,
  isHydratedPlan,
  shortenPeriod,
} from "../../../utils";
import { Container, FussyChild, cardBoxShadow } from "../../layout";
import { PeriodToggle } from "../../shared";
import {
  Box,
  Button,
  Flex,
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

export type PricingTableProps = RecursivePartial<DesignProps> & {
  callToActionUrl?: string;
  onCallToAction?: (
    plan: PlanViewPublicResponseData | CompanyPlanDetailResponseData,
  ) => unknown;
};

export const PricingTable = forwardRef<
  HTMLDivElement | null,
  ElementProps & PricingTableProps & React.HTMLAttributes<HTMLDivElement>
>(({ className, callToActionUrl, onCallToAction, ...rest }, ref) => {
  const props = resolveDesignProps(rest);

  const { t } = useTranslation();

  const { data, settings, hydratePublic, setCheckoutState } = useEmbed();

  const { planPeriod, currentAddOns, billingSubscription, canCheckout } =
    useMemo(() => {
      if (isCheckoutData(data)) {
        return {
          planPeriod: data.company?.plan?.planPeriod || "month",
          currentAddOns: data.company?.addOns || [],
          billingSubscription: data.company?.billingSubscription,
          canCheckout: data.capabilities?.checkout ?? true,
        };
      }

      return {
        planPeriod: "month",
        currentAddOns: [],
        billingSubscription: undefined,
        canCheckout: true,
      };
    }, [data]);

  const [selectedPeriod, setSelectedPeriod] = useState(planPeriod);

  const { plans, addOns, periods } = useAvailablePlans(selectedPeriod);

  const [entitlementCounts, setEntitlementCounts] = useState(() =>
    plans.reduce(entitlementCountsReducer, {}),
  );

  const isLightBackground = useIsLightBackground();

  const { isTrialSubscription, willSubscriptionCancel } = useMemo(() => {
    const isTrialSubscription = billingSubscription?.status === "trialing";
    const willSubscriptionCancel = billingSubscription?.cancelAtPeriodEnd;

    return {
      isTrialSubscription,
      willSubscriptionCancel,
    };
  }, [billingSubscription]);

  const trialEndDays = useTrialEnd();

  const handleToggleShowAll = (id: string) => {
    setEntitlementCounts((prev) => {
      const count = prev[id] ? { ...prev[id] } : undefined;

      if (count) {
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
      }

      return prev;
    });
  };

  const isStandalone = useMemo(() => !isCheckoutData(data), [data]);

  useEffect(() => {
    if (isStandalone) {
      hydratePublic();
    }
  }, [isStandalone, hydratePublic]);

  useEffect(() => {
    setEntitlementCounts(plans.reduce(entitlementCountsReducer, {}));
  }, [plans]);

  const showCallToAction = !isStandalone || typeof callToActionUrl === "string";

  const currentPlanIndex = plans.findIndex(
    (plan) => isHydratedPlan(plan) && plan.current,
  );

  const cardPadding = settings.theme.card.padding / TEXT_BASE_SIZE;

  const Wrapper = isStandalone ? Container : Fragment;

  return (
    <Wrapper>
      <FussyChild
        as={Flex}
        ref={ref}
        className={cx("sch-PricingTable", className)}
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
              display={props.header.fontStyle}
              $color={settings.theme.card.background}
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
                onSelect={(period) => {
                  if (period !== selectedPeriod) {
                    setSelectedPeriod(period);
                  }
                }}
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
                  isHydratedPlan(plan) &&
                  plan.current &&
                  planPeriod === selectedPeriod;
                const { price: planPrice, currency: planCurrency } =
                  getBillingPrice(
                    selectedPeriod === "year"
                      ? plan.yearlyPrice
                      : plan.monthlyPrice,
                  ) || {};

                const hasUsageBasedEntitlements = plan.entitlements.some(
                  (entitlement) => !!entitlement.priceBehavior,
                );
                const isUsageBasedPlan =
                  planPrice === 0 && hasUsageBasedEntitlements;
                const headerPriceFontStyle =
                  plan.custom || isUsageBasedPlan
                    ? settings.theme.typography.heading3
                    : settings.theme.typography[props.plans.name.fontStyle];

                const count = entitlementCounts[plan.id];
                const isExpanded =
                  count && count.limit > VISIBLE_ENTITLEMENT_COUNT;

                return (
                  <Flex
                    key={planIndex}
                    className="sch-PricingTable_Plan"
                    data-plan-id={plan.id}
                    $position="relative"
                    $flexDirection="column"
                    $padding={`${cardPadding}rem 0`}
                    $backgroundColor={settings.theme.card.background}
                    $borderRadius={`${settings.theme.card.borderRadius / TEXT_BASE_SIZE}rem`}
                    $outlineWidth="2px"
                    $outlineStyle="solid"
                    $outlineColor={
                      isActivePlan ? settings.theme.primary : "transparent"
                    }
                    {...(settings.theme.card.hasShadow && {
                      $boxShadow: cardBoxShadow,
                    })}
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
                        <Text display={props.plans.name.fontStyle}>
                          {plan.name}
                        </Text>
                      </Box>

                      {props.plans.description.isVisible && (
                        <Box $marginBottom="0.5rem">
                          <Text display={props.plans.description.fontStyle}>
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
                          <Text display={props.plans.name.fontStyle}>
                            /{selectedPeriod}
                          </Text>
                        )}
                      </Box>

                      {isActivePlan && (
                        <Flex
                          $position="absolute"
                          $right="1rem"
                          $top="1rem"
                          $backgroundColor={settings.theme.primary}
                          $borderRadius="9999px"
                          $padding="0.125rem 0.85rem"
                        >
                          <Text
                            $size={
                              0.75 * settings.theme.typography.text.fontSize
                            }
                            $color={
                              hexToHSL(settings.theme.primary).l > 50
                                ? "#000000"
                                : "#FFFFFF"
                            }
                          >
                            {isTrialSubscription &&
                            !willSubscriptionCancel &&
                            trialEndDays
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
                              <Text>
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
                                        entitlementPriceObject.priceTier
                                          .length - 1
                                      ];
                                    entitlementPrice =
                                      overagePrice.perUnitPriceDecimal
                                        ? Number(
                                            overagePrice.perUnitPriceDecimal,
                                          )
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
                                            settings.theme.primary,
                                            `color-mix(in oklch, ${settings.theme.card.background} 87.5%, ${isLightBackground ? "black" : "white"})`,
                                          ]}
                                        />
                                      )}

                                    {entitlement.feature?.name && (
                                      <Flex
                                        $flexDirection="column"
                                        $justifyContent="center"
                                        $gap="0.5rem"
                                      >
                                        <Text $leading={1.35}>
                                          {typeof entitlementPrice ===
                                            "number" &&
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
                                            entitlement.valueType ===
                                              "trait" ? (
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
                                              $size={
                                                0.875 *
                                                settings.theme.typography.text
                                                  .fontSize
                                              }
                                              $color={`color-mix(in oklch, ${settings.theme.typography.text.color}, ${settings.theme.card.background})`}
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
                                              {entitlement.feature
                                                .featureType === "trait" && (
                                                <>
                                                  /
                                                  {shortenPeriod(
                                                    selectedPeriod,
                                                  )}
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
                            .slice(
                              0,
                              count?.limit ?? VISIBLE_ENTITLEMENT_COUNT,
                            )}

                          {(count?.size || plan.entitlements.length) >
                            VISIBLE_ENTITLEMENT_COUNT && (
                            <Flex
                              $alignItems="center"
                              $justifyContent="start"
                              $marginTop="1rem"
                            >
                              <Icon
                                name={
                                  isExpanded ? "chevron-up" : "chevron-down"
                                }
                                style={{
                                  fontSize: "1.4rem",
                                  lineHeight: "1em",
                                  marginRight: ".25rem",
                                  color: "#D0D0D0",
                                }}
                              />
                              <Text
                                onClick={() => handleToggleShowAll(plan.id)}
                                onKeyDown={(event) => {
                                  if (
                                    event.key === "Enter" ||
                                    event.key === " "
                                  ) {
                                    event.preventDefault();
                                    handleToggleShowAll(plan.id);
                                  }
                                }}
                                style={{ cursor: "pointer" }}
                                display="link"
                                $leading={1}
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
                              color: settings.theme.primary,
                            }}
                          />

                          <Text $size={15} $leading={1}>
                            {t("Current plan")}
                          </Text>
                        </Flex>
                      ) : (
                        showCallToAction &&
                        (props.upgrade.isVisible ||
                          props.downgrade.isVisible) && (
                          <Button
                            type="button"
                            disabled={
                              ((isHydratedPlan(plan) && !plan.valid) ||
                                !canCheckout) &&
                              !plan.custom
                            }
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
                            {...(plan.custom
                              ? {
                                  as: "a",
                                  href:
                                    plan.customPlanConfig?.ctaWebSite ?? "#",
                                  target: "_blank",
                                  rel: "noreferrer",
                                }
                              : callToActionUrl
                                ? {
                                    as: "a",
                                    href: callToActionUrl,
                                    target: "_blank",
                                    rel: "noreferrer",
                                  }
                                : {
                                    onClick: () => {
                                      onCallToAction?.(plan);

                                      if (
                                        !isStandalone &&
                                        isHydratedPlan(plan) &&
                                        !plan.custom
                                      ) {
                                        setCheckoutState({
                                          period: selectedPeriod,
                                          planId: isActivePlan ? null : plan.id,
                                          usage: false,
                                        });
                                      }
                                    },
                                  })}
                            $fullWidth
                          >
                            {plan.custom ? (
                              (plan.customPlanConfig?.ctaText ??
                              t("Talk to support"))
                            ) : isHydratedPlan(plan) && !plan.valid ? (
                              <Tooltip
                                trigger={<Text>{t("Over usage limit")}</Text>}
                                content={
                                  <Text>
                                    {t(
                                      "Current usage exceeds the limit of this plan.",
                                    )}
                                  </Text>
                                }
                              />
                            ) : isHydratedPlan(plan) &&
                              plan.companyCanTrial &&
                              plan.isTrialable ? (
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
                    display={props.header.fontStyle}
                    $color={settings.theme.card.background}
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
                  const isCurrentAddOn = isHydratedPlan(addOn) && addOn.current;
                  const isActiveAddOn =
                    isCurrentAddOn &&
                    selectedPeriod ===
                      currentAddOns.find(
                        (currentAddOn) => currentAddOn.id === addOn.id,
                      )?.planPeriod;
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
                      $backgroundColor={settings.theme.card.background}
                      $borderRadius={`${settings.theme.card.borderRadius / TEXT_BASE_SIZE}rem`}
                      $outlineWidth="2px"
                      $outlineStyle="solid"
                      $outlineColor={
                        isActiveAddOn ? settings.theme.primary : "transparent"
                      }
                      {...(settings.theme.card.hasShadow && {
                        $boxShadow: cardBoxShadow,
                      })}
                    >
                      <Flex $flexDirection="column" $gap="0.75rem">
                        <Box>
                          <Text display={props.plans.name.fontStyle}>
                            {addOn.name}
                          </Text>
                        </Box>

                        {props.addOns.showDescription && (
                          <Box $marginBottom="0.5rem">
                            <Text display={props.plans.description.fontStyle}>
                              {addOn.description}
                            </Text>
                          </Box>
                        )}

                        <Box>
                          <Text display={props.plans.name.fontStyle}>
                            {formatCurrency(addOnPrice ?? 0, addOnCurrency)}
                          </Text>

                          <Text
                            display={props.plans.name.fontStyle}
                            $size={
                              (16 / 30) *
                              settings.theme.typography[
                                props.plans.name.fontStyle
                              ].fontSize
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
                            $backgroundColor={settings.theme.primary}
                            $borderRadius="9999px"
                            $padding="0.125rem 0.85rem"
                          >
                            <Text
                              $size={
                                0.75 * settings.theme.typography.text.fontSize
                              }
                              $color={
                                hexToHSL(settings.theme.primary).l > 50
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
                                              settings.theme.primary,
                                              isLightBackground
                                                ? "hsla(0, 0%, 0%, 0.0625)"
                                                : "hsla(0, 0%, 100%, 0.25)",
                                            ]}
                                          />
                                        )}

                                      {entitlement.feature?.name && (
                                        <Flex $alignItems="center">
                                          <Text>
                                            {entitlement.valueType ===
                                              "numeric" ||
                                            entitlement.valueType ===
                                              "unlimited" ||
                                            entitlement.valueType ===
                                              "trait" ? (
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
                                                        billing:
                                                          "billing period",
                                                        current_day: "day",
                                                        current_month: "month",
                                                        current_year: "year",
                                                      }[
                                                        entitlement.metricPeriod
                                                      ]
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

                        {showCallToAction && props.upgrade.isVisible && (
                          <Button
                            type="button"
                            disabled={
                              (isHydratedPlan(addOn) && !addOn.valid) ||
                              !canCheckout
                            }
                            $size={props.upgrade.buttonSize}
                            $color={
                              isActiveAddOn
                                ? "danger"
                                : props.upgrade.buttonStyle
                            }
                            $variant={
                              isActiveAddOn
                                ? "ghost"
                                : isCurrentAddOn
                                  ? "outline"
                                  : "filled"
                            }
                            {...(callToActionUrl
                              ? {
                                  as: "a",
                                  href: callToActionUrl,
                                  rel: "noreferrer",
                                  target: "_blank",
                                }
                              : {
                                  onClick: () => {
                                    onCallToAction?.(addOn);

                                    if (!isStandalone && !addOn.custom) {
                                      setCheckoutState({
                                        period: selectedPeriod,
                                        addOnId: isActiveAddOn
                                          ? null
                                          : addOn.id,
                                        usage: false,
                                      });
                                    }
                                  },
                                })}
                            $fullWidth
                          >
                            {isActiveAddOn
                              ? t("Remove add-on")
                              : isCurrentAddOn
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
    </Wrapper>
  );
});

PricingTable.displayName = "PricingTable";
