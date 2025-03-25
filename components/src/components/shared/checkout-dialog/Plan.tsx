import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components";

import { TEXT_BASE_SIZE, VISIBLE_ENTITLEMENT_COUNT } from "../../../const";
import { type SelectedPlan, useIsLightBackground } from "../../../hooks";
import {
  darken,
  formatCurrency,
  formatNumber,
  getFeatureName,
  hexToHSL,
  lighten,
  shortenPeriod,
} from "../../../utils";
import { ButtonLink } from "../../elements/pricing-table/styles";
import { cardBoxShadow } from "../../layout";
import {
  Box,
  EmbedButton,
  Flex,
  Icon,
  type IconNameTypes,
  IconRound,
  Text,
  Tooltip,
} from "../../ui";

interface PlanProps {
  isLoading: boolean;
  plans: SelectedPlan[];
  selectedPlan?: SelectedPlan;
  period: string;
  selectPlan: (updates: { plan: SelectedPlan; period?: string }) => void;
}

export const Plan = ({
  isLoading,
  plans,
  selectedPlan,
  period,
  selectPlan,
}: PlanProps) => {
  const { t } = useTranslation();

  const theme = useTheme();

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

  const cardPadding = theme.card.padding / TEXT_BASE_SIZE;

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
    <>
      <Box
        $display="grid"
        $gridTemplateColumns="repeat(auto-fill, minmax(300px, 1fr))"
        $gap="1rem"
        $flexGrow={1}
      >
        {plans.map((plan, planIndex) => {
          const count = entitlementCounts[plan.id];
          const isExpanded = count.limit > VISIBLE_ENTITLEMENT_COUNT;
          const { price: planPrice, currency: planCurrency } =
            (period === "month"
              ? plan.monthlyPrice
              : period === "year" && plan.yearlyPrice) || {};

          return (
            <Flex
              key={planIndex}
              $position="relative"
              $flexDirection="column"
              $padding={`${0.75 * cardPadding}rem 0`}
              $backgroundColor={theme.card.background}
              $borderRadius={`${theme.card.borderRadius / TEXT_BASE_SIZE}rem`}
              $outlineWidth="2px"
              $outlineStyle="solid"
              $outlineColor={
                plan.id === selectedPlan?.id ? theme.primary : "transparent"
              }
              {...(theme.card.hasShadow && { $boxShadow: cardBoxShadow })}
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
                  <Text
                    $font={theme.typography.heading2.fontFamily}
                    $size={theme.typography.heading2.fontSize}
                    $weight={theme.typography.heading2.fontWeight}
                    $color={theme.typography.heading2.color}
                  >
                    {plan.name}
                  </Text>
                </Box>

                <Box $marginBottom="0.5rem" $lineHeight={1.35}>
                  <Text
                    $font={theme.typography.text.fontFamily}
                    $size={theme.typography.text.fontSize}
                    $weight={theme.typography.text.fontWeight}
                    $color={theme.typography.text.color}
                  >
                    {plan.description}
                  </Text>
                </Box>

                <Box>
                  <Text
                    $font={theme.typography.heading2.fontFamily}
                    $size={theme.typography.heading2.fontSize}
                    $weight={theme.typography.heading2.fontWeight}
                    $color={theme.typography.heading2.color}
                  >
                    {plan.custom
                      ? plan.customPlanConfig?.priceText
                        ? plan.customPlanConfig.priceText
                        : t("Custom Plan Price")
                      : formatCurrency(planPrice ?? 0, planCurrency)}
                  </Text>

                  {!plan.custom && (
                    <Text
                      $font={theme.typography.heading2.fontFamily}
                      $size={(16 / 30) * theme.typography.heading2.fontSize}
                      $weight={theme.typography.heading2.fontWeight}
                      $color={theme.typography.heading2.color}
                    >
                      /{period}
                    </Text>
                  )}
                </Box>

                {plan.current && (
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
                        const {
                          price: entitlementPrice,
                          currency: entitlementCurrency,
                        } =
                          (period === "month"
                            ? entitlement.meteredMonthlyPrice
                            : period === "year" &&
                              entitlement.meteredYearlyPrice) || {};

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
                                    $weight={theme.typography.text.fontWeight}
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
                                        {getFeatureName(entitlement.feature, 1)}
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
                                        $font={theme.typography.text.fontFamily}
                                        $size={
                                          0.875 * theme.typography.text.fontSize
                                        }
                                        $weight={
                                          theme.typography.text.fontWeight
                                        }
                                        $color={
                                          hexToHSL(theme.typography.text.color)
                                            .l > 50
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
                                        {getFeatureName(entitlement.feature, 1)}
                                        {entitlement.feature.featureType ===
                                          "trait" && (
                                          <>/{shortenPeriod(period)}</>
                                        )}{" "}
                                        {t("overage fee")}
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

                {plan.id === selectedPlan?.id ? (
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
                      $size={(15 / 16) * theme.typography.text.fontSize}
                      $weight={theme.typography.text.fontWeight}
                      $color={theme.typography.text.color}
                      $leading={1}
                    >
                      {plan.current ? t("Current plan") : t("Selected")}
                    </Text>
                  </Flex>
                ) : (
                  <EmbedButton
                    type="button"
                    disabled={(isLoading || !plan.valid) && !plan.custom}
                    {...{
                      onClick: () => {
                        if (plan.custom) {
                          return;
                        }

                        selectPlan({ plan });
                      },
                    }}
                    $size="sm"
                    $color="primary"
                    $variant={plan.current ? "outline" : "filled"}
                  >
                    {plan.custom ? (
                      <ButtonLink
                        href={plan.customPlanConfig?.ctaWebSite ?? "#"}
                        target="_blank"
                      >
                        {plan.customPlanConfig?.ctaText ?? t("Custom Plan CTA")}
                      </ButtonLink>
                    ) : !plan.valid ? (
                      <Tooltip
                        trigger={t("Over usage limit")}
                        content={t(
                          "Current usage exceeds the limit of this plan.",
                        )}
                      />
                    ) : plan.companyCanTrial ? (
                      t("Trial plan", { days: plan.trialDays })
                    ) : (
                      t("Choose plan")
                    )}
                  </EmbedButton>
                )}
              </Flex>
            </Flex>
          );
        })}
      </Box>
    </>
  );
};
