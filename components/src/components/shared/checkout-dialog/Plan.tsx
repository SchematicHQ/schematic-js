import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { TEXT_BASE_SIZE, VISIBLE_ENTITLEMENT_COUNT } from "../../../const";
import {
  useEmbed,
  useIsLightBackground,
  type SelectedPlan,
} from "../../../hooks";
import {
  darken,
  entitlementCountsReducer,
  formatCurrency,
  formatNumber,
  getEntitlementPrice,
  getFeatureName,
  getMetricPeriodName,
  getPlanPrice,
  hexToHSL,
  isCheckoutData,
  isHydratedPlan,
  lighten,
  shortenPeriod,
} from "../../../utils";
import { cardBoxShadow } from "../../layout";
import { Box, Button, Flex, Icon, Text, Tooltip } from "../../ui";

interface SelectedProps {
  isCurrent?: boolean;
  isTrial?: boolean;
}

const Selected = ({ isCurrent = false, isTrial = false }: SelectedProps) => {
  const { t } = useTranslation();

  const { settings } = useEmbed();

  const text = useMemo(() => {
    if (isCurrent) {
      return isTrial ? t("Trial in progress") : t("Current plan");
    }

    return isTrial ? t("Trial selected") : t("Plan selected");
  }, [t, isCurrent, isTrial]);

  return (
    <Flex
      $justifyContent="center"
      $alignItems="center"
      $gap="0.25rem"
      $padding="0.625rem 0"
    >
      <Icon name="check-rounded" color={settings.theme.primary} />

      <Text
        $size={0.9375 * settings.theme.typography.text.fontSize}
        $leading={1}
      >
        {text}
      </Text>
    </Flex>
  );
};

interface PlanButtonGroupProps {
  plan: SelectedPlan;
  isLoading: boolean;
  isSelected: boolean;
  onSelect: (updates: {
    plan: SelectedPlan;
    period?: string;
    shouldTrial?: boolean;
  }) => void;
  shouldTrial: boolean;
}

const PlanButtonGroup = ({
  plan,
  isLoading,
  isSelected,
  onSelect,
  shouldTrial,
}: PlanButtonGroupProps) => {
  const { t } = useTranslation();

  const { data } = useEmbed();

  const { isCurrentPlan, isValidPlan, isTrialing } = useMemo(() => {
    if (isCheckoutData(data)) {
      return {
        isCurrentPlan: data.company?.plan?.id === plan.id,
        isValidPlan: isHydratedPlan(plan) && plan.valid,
        isTrialing: data.subscription?.status === "trialing",
      };
    }

    return {
      isCurrentPlan: false,
      isValidPlan: true,
      isTrialing: false,
    };
  }, [data, plan]);

  if (isHydratedPlan(plan) && plan.companyCanTrial && plan.isTrialable) {
    return (
      <Flex $flexDirection="column" $gap="1.5rem">
        {!isTrialing && (
          <>
            {isSelected && shouldTrial ? (
              <Selected isCurrent={isCurrentPlan} isTrial={shouldTrial} />
            ) : (
              <Button
                type="button"
                disabled={(isLoading || !isValidPlan) && !plan.custom}
                {...(plan.custom
                  ? {
                      as: "a",
                      href: plan.customPlanConfig?.ctaWebSite ?? "#",
                      target: "_blank",
                      rel: "noreferrer",
                    }
                  : {
                      onClick: () => {
                        onSelect({
                          plan,
                          shouldTrial: true,
                        });
                      },
                    })}
                $size="sm"
                $color="primary"
                $variant="filled"
                $fullWidth
              >
                {plan.custom ? (
                  (plan.customPlanConfig?.ctaText ?? t("Talk to support"))
                ) : !isValidPlan ? (
                  <Tooltip
                    trigger={<Text>{t("Over usage limit")}</Text>}
                    content={
                      <Text>
                        {t("Current usage exceeds the limit of this plan.")}
                      </Text>
                    }
                  />
                ) : (
                  t("Start X day trial", { days: plan.trialDays })
                )}
              </Button>
            )}
          </>
        )}

        {!plan.custom && (
          <>
            {isSelected && (!shouldTrial || isTrialing) ? (
              <Selected isCurrent={isCurrentPlan} />
            ) : (
              <Button
                type="button"
                disabled={isLoading || !isValidPlan}
                onClick={() => {
                  onSelect({ plan, shouldTrial: false });
                }}
                $size="sm"
                $color="primary"
                $variant={isTrialing ? "filled" : "text"}
                $fullWidth
              >
                {!isValidPlan ? (
                  <Tooltip
                    trigger={<Text>{t("Over usage limit")}</Text>}
                    content={
                      <Text>
                        {t("Current usage exceeds the limit of this plan.")}
                      </Text>
                    }
                  />
                ) : (
                  t("Choose plan")
                )}
              </Button>
            )}
          </>
        )}
      </Flex>
    );
  }

  return isSelected ? (
    <Selected isCurrent={isCurrentPlan} />
  ) : (
    <Button
      type="button"
      disabled={(isLoading || !isValidPlan) && !plan.custom}
      {...(plan.custom
        ? {
            as: "a",
            href: plan.customPlanConfig?.ctaWebSite ?? "#",
            target: "_blank",
            rel: "noreferrer",
          }
        : {
            onClick: () => {
              onSelect({ plan });
            },
          })}
      $size="sm"
      $color="primary"
      $variant="filled"
      $fullWidth
    >
      {plan.custom ? (
        (plan.customPlanConfig?.ctaText ?? t("Talk to support"))
      ) : !isValidPlan ? (
        <Tooltip
          trigger={<Text>{t("Over usage limit")}</Text>}
          content={
            <Text>{t("Current usage exceeds the limit of this plan.")}</Text>
          }
        />
      ) : (
        t("Choose plan")
      )}
    </Button>
  );
};

interface PlanProps {
  isLoading: boolean;
  plans: SelectedPlan[];
  selectedPlan?: SelectedPlan;
  period: string;
  selectPlan: (updates: {
    plan: SelectedPlan;
    period?: string;
    shouldTrial?: boolean;
  }) => void;
  shouldTrial: boolean;
}

export const Plan = ({
  isLoading,
  plans,
  selectedPlan,
  period,
  selectPlan,
  shouldTrial,
}: PlanProps) => {
  const { t } = useTranslation();

  const { data, settings } = useEmbed();

  const isLightBackground = useIsLightBackground();

  const [entitlementCounts, setEntitlementCounts] = useState(() =>
    plans.reduce(entitlementCountsReducer, {}),
  );

  const isTrialing = useMemo(
    () => isCheckoutData(data) && data.subscription?.status === "trialing",
    [data],
  );

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

  useEffect(() => {
    setEntitlementCounts(plans.reduce(entitlementCountsReducer, {}));
  }, [plans]);

  const cardPadding = settings.theme.card.padding / TEXT_BASE_SIZE;

  return (
    <>
      <Box
        $display="grid"
        $gridTemplateColumns="repeat(auto-fill, minmax(300px, 1fr))"
        $gap="1rem"
        $flexGrow={1}
      >
        {plans.map((plan, planIndex) => {
          const { price: planPrice, currency: planCurrency } =
            getPlanPrice(plan, period) || {};
          const hasUsageBasedEntitlements = plan.entitlements.some(
            (entitlement) => !!entitlement.priceBehavior,
          );
          const isUsageBasedPlan = planPrice === 0 && hasUsageBasedEntitlements;
          const headerPriceFontStyle =
            plan.custom || isUsageBasedPlan
              ? settings.theme.typography.heading3
              : settings.theme.typography.heading2;

          const count = entitlementCounts[plan.id];
          const isExpanded = count && count.limit > VISIBLE_ENTITLEMENT_COUNT;

          return (
            <Flex
              key={planIndex}
              $position="relative"
              $flexDirection="column"
              $padding={`${0.75 * cardPadding}rem 0`}
              $backgroundColor={settings.theme.card.background}
              $borderRadius={`${settings.theme.card.borderRadius / TEXT_BASE_SIZE}rem`}
              $outlineWidth="2px"
              $outlineStyle="solid"
              $outlineColor={
                plan.id === selectedPlan?.id
                  ? settings.theme.primary
                  : "transparent"
              }
              {...(settings.theme.card.hasShadow && {
                $boxShadow: cardBoxShadow,
              })}
            >
              <Flex
                $flexDirection="column"
                $gap="0.5rem"
                $padding={`0 ${cardPadding}rem ${0.75 * cardPadding}rem`}
                $borderWidth="0"
                $borderBottomWidth="1px"
                $borderStyle="solid"
                $borderColor={
                  isLightBackground
                    ? "hsla(0, 0%, 0%, 0.175)"
                    : "hsla(0, 0%, 100%, 0.175)"
                }
                $viewport={{
                  md: {
                    $gap: "1rem",
                  },
                }}
              >
                <Box>
                  <Text display="heading2">{plan.name}</Text>
                </Box>

                <Box $marginBottom="0.5rem" $lineHeight={1.35}>
                  <Text>{plan.description}</Text>
                </Box>

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
                      display="heading2"
                      $size={
                        (16 / 30) * settings.theme.typography.heading2.fontSize
                      }
                    >
                      /{period}
                    </Text>
                  )}
                </Box>

                {isHydratedPlan(plan) && plan.current && (
                  <Flex
                    $position="absolute"
                    $right="1rem"
                    $top="1rem"
                    $backgroundColor={settings.theme.primary}
                    $borderRadius="9999px"
                    $padding="0.125rem 0.85rem"
                  >
                    <Text
                      $size={0.75 * settings.theme.typography.text.fontSize}
                      $color={
                        hexToHSL(settings.theme.primary).l > 50
                          ? "#000000"
                          : "#FFFFFF"
                      }
                    >
                      {isTrialing ? t("Trialing") : t("Active")}
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
                <Flex $flexDirection="column" $gap="1rem" $flexGrow={1}>
                  {plan.entitlements
                    .reduce(
                      (
                        acc: React.ReactElement[],
                        entitlement,
                        entitlementIndex,
                      ) => {
                        const hasNumericValue =
                          entitlement.valueType === "numeric" ||
                          entitlement.valueType === "unlimited" ||
                          entitlement.valueType === "trait";

                        const limit =
                          entitlement.softLimit ?? entitlement.valueNumeric;

                        const {
                          price: entitlementPrice,
                          currency: entitlementCurrency,
                          packageSize: entitlementPackageSize = 1,
                        } = getEntitlementPrice(entitlement, period) || {};

                        const metricPeriodName =
                          getMetricPeriodName(entitlement);

                        if (
                          entitlement.priceBehavior &&
                          typeof entitlementPrice !== "number"
                        ) {
                          return acc;
                        }

                        acc.push(
                          <Flex
                            key={entitlementIndex}
                            $flexWrap="wrap"
                            $justifyContent="space-between"
                            $alignItems="center"
                            $gap="1rem"
                          >
                            <Flex $gap="1rem">
                              {entitlement.feature?.icon && (
                                <Icon
                                  name={entitlement.feature.icon}
                                  color={settings.theme.primary}
                                  background={
                                    isLightBackground
                                      ? "hsla(0, 0%, 0%, 0.0625)"
                                      : "hsla(0, 0%, 100%, 0.25)"
                                  }
                                  rounded
                                />
                              )}

                              {entitlement.feature?.name && (
                                <Flex
                                  $flexDirection="column"
                                  $justifyContent="center"
                                  $gap="0.5rem"
                                >
                                  <Text $leading={1.35}>
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
                                            {t("per")} {period}
                                          </>
                                        )}
                                      </>
                                    ) : hasNumericValue ? (
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

                                        {metricPeriodName && (
                                          <>
                                            {" "}
                                            {t("per")} {t(metricPeriodName)}
                                          </>
                                        )}
                                      </>
                                    ) : (
                                      entitlement.feature.name
                                    )}
                                  </Text>

                                  {entitlement.priceBehavior === "overage" &&
                                    typeof entitlementPrice === "number" && (
                                      <Text
                                        $size={
                                          0.875 *
                                          settings.theme.typography.text
                                            .fontSize
                                        }
                                        $color={
                                          hexToHSL(
                                            settings.theme.typography.text
                                              .color,
                                          ).l > 50
                                            ? darken(
                                                settings.theme.typography.text
                                                  .color,
                                                0.46,
                                              )
                                            : lighten(
                                                settings.theme.typography.text
                                                  .color,
                                                0.46,
                                              )
                                        }
                                        $leading={1.35}
                                      >
                                        {t("then")}{" "}
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
                                          <>/{shortenPeriod(period)}</>
                                        )}
                                      </Text>
                                    )}
                                </Flex>
                              )}
                            </Flex>
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
                      $gap="0.5rem"
                      $marginTop="1rem"
                    >
                      <Icon
                        name={isExpanded ? "chevron-up" : "chevron-down"}
                        color="#D0D0D0"
                      />
                      <Text
                        onClick={() => handleToggleShowAll(plan.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            handleToggleShowAll(plan.id);
                          }
                        }}
                        display="link"
                        $leading={1}
                        style={{ cursor: "pointer" }}
                      >
                        {isExpanded ? t("Hide all") : t("See all")}
                      </Text>
                    </Flex>
                  )}
                </Flex>

                <PlanButtonGroup
                  plan={plan}
                  isLoading={isLoading}
                  isSelected={plan.id === selectedPlan?.id}
                  onSelect={selectPlan}
                  shouldTrial={shouldTrial}
                />
              </Flex>
            </Flex>
          );
        })}
      </Box>
    </>
  );
};
