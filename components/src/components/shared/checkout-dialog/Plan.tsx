import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { TEXT_BASE_SIZE, VISIBLE_ENTITLEMENT_COUNT } from "../../../const";
import {
  useEmbed,
  useIsLightBackground,
  type SelectedPlan,
} from "../../../hooks";
import {
  darken,
  formatCurrency,
  formatNumber,
  getBillingPrice,
  getFeatureName,
  hexToHSL,
  isCheckoutData,
  isHydratedPlan,
  lighten,
  shortenPeriod,
} from "../../../utils";
import { ButtonLink } from "../../elements/pricing-table/styles";
import { cardBoxShadow } from "../../layout";
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
      <Icon
        name="check-rounded"
        style={{
          fontSize: 20,
          lineHeight: 1,
          color: settings.theme.primary,
        }}
      />

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
  willTrial: boolean;
}

const PlanButtonGroup = ({
  plan,
  isLoading,
  isSelected,
  onSelect,
  willTrial,
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
            {isSelected && willTrial ? (
              <Selected isCurrent={isCurrentPlan} isTrial={willTrial} />
            ) : (
              <Button
                type="button"
                disabled={(isLoading || !isValidPlan) && !plan.custom}
                {...(!plan.custom && {
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
                  <ButtonLink
                    href={plan.customPlanConfig?.ctaWebSite ?? "#"}
                    target="_blank"
                  >
                    {plan.customPlanConfig?.ctaText ?? t("Talk to support")}
                  </ButtonLink>
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
            {isSelected && (!willTrial || isTrialing) ? (
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
      {...(!plan.custom && {
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
        <ButtonLink
          href={plan.customPlanConfig?.ctaWebSite ?? "#"}
          target="_blank"
        >
          {plan.customPlanConfig?.ctaText ?? t("Talk to support")}
        </ButtonLink>
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
  willTrial: boolean;
}

export const Plan = ({
  isLoading,
  plans,
  selectedPlan,
  period,
  selectPlan,
  willTrial,
}: PlanProps) => {
  const { t } = useTranslation();

  const { data, settings } = useEmbed();

  const isLightBackground = useIsLightBackground();

  const [seeAll, setSeeAll] = useState(false);

  const isTrialing = useMemo(
    () => isCheckoutData(data) && data.subscription?.status === "trialing",
    [data],
  );

  const toggleSeeAll = () => {
    setSeeAll((prev) => !prev);
  };

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
            getBillingPrice(
              period === "year" ? plan.yearlyPrice : plan.monthlyPrice,
            ) || {};
          const hasUsageBasedEntitlements = plan.entitlements.some(
            (entitlement) => !!entitlement.priceBehavior,
          );
          const isUsageBasedPlan = planPrice === 0 && hasUsageBasedEntitlements;
          const headerPriceFontStyle =
            plan.custom || isUsageBasedPlan
              ? settings.theme.typography.heading3
              : settings.theme.typography.heading2;

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

                        let metricPeriodText: string | undefined;
                        if (
                          hasNumericValue &&
                          entitlement.metricPeriod &&
                          entitlement.priceBehavior !== "overage"
                        ) {
                          metricPeriodText = {
                            billing: t("billing period"),
                            current_day: t("day"),
                            current_month: t("month"),
                            current_year: t("year"),
                          }[entitlement.metricPeriod];
                        }

                        const limit =
                          entitlement.softLimit ?? entitlement.valueNumeric;

                        const entitlementPriceObject = getBillingPrice(
                          period === "year"
                            ? entitlement.meteredYearlyPrice
                            : entitlement.meteredMonthlyPrice,
                        );

                        let entitlementPrice = entitlementPriceObject?.price;
                        const entitlementCurrency =
                          entitlementPriceObject?.currency;
                        const entitlementPackageSize =
                          entitlementPriceObject?.packageSize ?? 1;

                        if (
                          entitlement.priceBehavior === "overage" &&
                          entitlementPriceObject
                        ) {
                          const { priceTier } = entitlementPriceObject;
                          if (priceTier.length > 1) {
                            const lastTier = priceTier[priceTier.length - 1];
                            const { perUnitPrice, perUnitPriceDecimal } =
                              lastTier;
                            entitlementPrice = perUnitPriceDecimal
                              ? Number(perUnitPriceDecimal)
                              : (perUnitPrice ?? 0);
                          }
                        }

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
                                        {metricPeriodText ? (
                                          <>
                                            {" "}
                                            {t("per")} {metricPeriodText}
                                          </>
                                        ) : (
                                          entitlement.priceBehavior ===
                                            "overage" &&
                                          entitlement.feature.featureType ===
                                            "event" && (
                                            <>/{shortenPeriod(period)}</>
                                          )
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
                    .slice(0, seeAll ? 9999 : VISIBLE_ENTITLEMENT_COUNT)}

                  {plan.entitlements.length > VISIBLE_ENTITLEMENT_COUNT && (
                    <Flex
                      $alignItems="center"
                      $justifyContent="start"
                      $marginTop="1rem"
                    >
                      <Icon
                        name={seeAll ? "chevron-up" : "chevron-down"}
                        style={{
                          fontSize: "1.4rem",
                          lineHeight: "1em",
                          marginRight: ".25rem",
                          color: "#D0D0D0",
                        }}
                      />
                      <Text
                        onClick={toggleSeeAll}
                        display="link"
                        $leading={1}
                        style={{ cursor: "pointer" }}
                      >
                        {seeAll ? t("Hide all") : t("See all")}
                      </Text>
                    </Flex>
                  )}
                </Flex>

                <PlanButtonGroup
                  plan={plan}
                  isLoading={isLoading}
                  isSelected={plan.id === selectedPlan?.id}
                  onSelect={selectPlan}
                  willTrial={willTrial}
                />
              </Flex>
            </Flex>
          );
        })}
      </Box>
    </>
  );
};
