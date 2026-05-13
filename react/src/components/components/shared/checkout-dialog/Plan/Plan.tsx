import { useState } from "react";
import { useTranslation } from "react-i18next";

import { BillingProductPriceInterval } from "../../../../api/checkoutexternal";
import { TEXT_BASE_SIZE, VISIBLE_ENTITLEMENT_COUNT } from "../../../../const";
import { useEmbed, useIsLightBackground, useTrialEnd } from "../../../../hooks";
import type { SelectedPlan } from "../../../../types";
import {
  formatCurrency,
  getAutoTopupAmount,
  getAutoTopupThresholdCredits,
  getFeatureName,
  getPlanPrice,
  groupPlanCreditGrants,
  hexToHSL,
  isAutoTopupEnabled,
  mergeCompanyGrants,
} from "../../../../utils";
import { cardBoxShadow } from "../../../layout";
import { AutoTopupNotice } from "../../../shared";
import { Box, Flex, Icon, Text } from "../../../ui";

import { ButtonGroup } from "./ButtonGroup";
import { Entitlement } from "./Entitlement";

interface PlanProps {
  portal?: HTMLElement | null;
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
  currency?: string;
}

export const Plan = ({
  portal,
  isLoading,
  plans,
  selectedPlan,
  period,
  selectPlan,
  shouldTrial,
  currency,
}: PlanProps) => {
  const { t } = useTranslation();

  const { data, settings } = useEmbed();

  const isLightBackground = useIsLightBackground();

  const trialEnd = useTrialEnd();

  const [entitlementVisibility, setEntitlementVisibility] = useState<
    Record<string, boolean | undefined>
  >({});

  const handleToggleShowAll = (id: string) => {
    setEntitlementVisibility((prev) => {
      const updated = !(prev[id] ?? false);

      return {
        ...prev,
        [id]: updated,
      };
    });
  };

  const isTrialing = data?.subscription?.status === "trialing";
  const showAsMonthlyPrices =
    data?.displaySettings?.showAsMonthlyPrices ?? false;
  const showCredits = data?.displaySettings?.showCredits ?? true;
  const showPeriodToggle = data?.displaySettings?.showPeriodToggle ?? true;
  const showZeroPriceAsFree =
    data?.displaySettings?.showZeroPriceAsFree ?? false;

  const cardPadding = settings.theme.card.padding / TEXT_BASE_SIZE;

  return (
    <Box
      $display="grid"
      $gridTemplateColumns="repeat(auto-fill, minmax(300px, 1fr))"
      $gap="1rem"
      $flexGrow={1}
    >
      {plans.map((plan, planIndex) => {
        const planPeriod = showPeriodToggle
          ? period
          : plan.monthlyPrice
            ? BillingProductPriceInterval.Month
            : plan.quarterlyPrice
              ? "quarter"
              : plan.yearlyPrice
                ? BillingProductPriceInterval.Year
                : BillingProductPriceInterval.Month;
        const { price: planPrice, currency: planCurrency } =
          getPlanPrice(
            plan,
            planPeriod,
            { useSelectedPeriod: true },
            currency,
          ) || {};
        const credits = groupPlanCreditGrants(plan.includedCreditGrants);
        const hasUsageBasedEntitlements = (plan.entitlements ?? []).some(
          (entitlement) => !!entitlement.priceBehavior,
        );
        const isFreePlan = planPrice === 0;
        const isUsageBasedPlan = isFreePlan && hasUsageBasedEntitlements;
        const headerPriceFontStyle = settings.theme.typography.heading2;

        const isExpanded = entitlementVisibility[plan.id] ?? false;

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
              $borderWidth={0}
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
                      : isFreePlan && showZeroPriceAsFree
                        ? t("Free")
                        : showAsMonthlyPrices &&
                            planPeriod === BillingProductPriceInterval.Year
                          ? formatCurrency((planPrice ?? 0) / 12, {
                              currency: planCurrency,
                              testSignificantDigits: false,
                            })
                          : showAsMonthlyPrices && planPeriod === "quarter"
                            ? formatCurrency((planPrice ?? 0) / 3, {
                                currency: planCurrency,
                                testSignificantDigits: false,
                              })
                            : formatCurrency(planPrice ?? 0, planCurrency)}
                </Text>

                {!plan.custom && !isFreePlan && (
                  <Text
                    display="heading2"
                    $size={
                      (16 / 30) * settings.theme.typography.heading2.fontSize
                    }
                  >
                    /
                    {showAsMonthlyPrices &&
                    planPeriod === BillingProductPriceInterval.Year
                      ? t("month, billed yearly")
                      : showAsMonthlyPrices && planPeriod === "quarter"
                        ? t("month, billed quarterly")
                        : t(planPeriod)}
                  </Text>
                )}
              </Box>

              {showCredits && credits.length > 0 && (
                <Flex
                  $flexDirection="column"
                  $gap="1rem"
                  $flexGrow={1}
                  $marginTop="0.5rem"
                >
                  {credits.map((credit, creditIndex) => {
                    const planCreditGrant = mergeCompanyGrants(
                      plan.includedCreditGrants,
                      data?.company?.plan?.includedCreditGrants,
                    ).find((grant) => grant.creditId === credit.id);
                    const hasAutoTopup = isAutoTopupEnabled(planCreditGrant);
                    const thresholdCredits =
                      getAutoTopupThresholdCredits(planCreditGrant);
                    const topupAmount = getAutoTopupAmount(planCreditGrant);

                    return (
                      <Flex
                        key={creditIndex}
                        $flexWrap="wrap"
                        $justifyContent="space-between"
                        $alignItems="center"
                        $gap="1rem"
                      >
                        <Flex $gap="1rem">
                          {credit.icon && (
                            <Icon
                              name={credit.icon}
                              color={settings.theme.primary}
                              background={
                                isLightBackground
                                  ? "hsla(0, 0%, 0%, 0.0625)"
                                  : "hsla(0, 0%, 100%, 0.25)"
                              }
                              rounded
                            />
                          )}

                          <Text>
                            {credit.quantity}{" "}
                            {getFeatureName(credit, credit.quantity)}
                            {credit.period && (
                              <>
                                {" "}
                                {t("per")} {credit.period}
                              </>
                            )}
                            {hasAutoTopup && planCreditGrant && (
                              <AutoTopupNotice
                                portal={portal}
                                thresholdCredits={thresholdCredits}
                                topupAmount={topupAmount}
                              />
                            )}
                          </Text>
                        </Flex>
                      </Flex>
                    );
                  })}
                </Flex>
              )}

              {plan.current && (
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
                    {isTrialing && typeof trialEnd.endDate !== "undefined"
                      ? t("X time left in trial", trialEnd)
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
              {(plan.entitlements ?? []).length > 0 && (
                <Flex $flexDirection="column" $gap="1rem" $flexGrow={1}>
                  {(plan.entitlements ?? []).reduce(
                    (acc: React.ReactNode[], entitlement, entitlementIndex) => {
                      if (
                        isExpanded ||
                        entitlementIndex < VISIBLE_ENTITLEMENT_COUNT
                      ) {
                        acc.push(
                          <Entitlement
                            key={entitlementIndex}
                            portal={portal}
                            entitlement={entitlement}
                            period={planPeriod}
                            credits={credits}
                            currency={currency}
                          />,
                        );
                      }

                      return acc;
                    },
                    [],
                  )}

                  {(plan.entitlements ?? []).length >
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
                        $leading="none"
                        style={{ cursor: "pointer" }}
                      >
                        {isExpanded ? t("Hide all") : t("See all")}
                      </Text>
                    </Flex>
                  )}
                </Flex>
              )}

              <ButtonGroup
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
  );
};
