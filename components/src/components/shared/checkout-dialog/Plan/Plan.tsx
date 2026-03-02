import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  PriceInterval,
  TEXT_BASE_SIZE,
  VISIBLE_ENTITLEMENT_COUNT,
} from "../../../../const";
import { useEmbed, useIsLightBackground, useTrialEnd } from "../../../../hooks";
import type { SelectedPlan } from "../../../../types";
import {
  entitlementCountsReducer,
  formatCurrency,
  getFeatureName,
  getPlanPrice,
  groupPlanCreditGrants,
  hexToHSL,
} from "../../../../utils";
import { cardBoxShadow } from "../../../layout";
import { Box, Flex, Icon, Text, Tooltip } from "../../../ui";

import { ButtonGroup } from "./ButtonGroup";
import { Entitlement } from "./Entitlement";

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
  tooltipPortal?: HTMLElement | null;
}

export const Plan = ({
  isLoading,
  plans,
  selectedPlan,
  period,
  selectPlan,
  shouldTrial,
  tooltipPortal,
}: PlanProps) => {
  const { t } = useTranslation();

  const { data, settings } = useEmbed();

  const isLightBackground = useIsLightBackground();

  const trialEnd = useTrialEnd();

  const [entitlementCounts, setEntitlementCounts] = useState(() =>
    plans.reduce(entitlementCountsReducer, {}),
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
    // TODO: refactor entitlement counts
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEntitlementCounts(plans.reduce(entitlementCountsReducer, {}));
  }, [plans]);

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
          : plan.yearlyPrice && !plan.monthlyPrice
            ? PriceInterval.Year
            : PriceInterval.Month;
        const { price: planPrice, currency: planCurrency } =
          getPlanPrice(plan, planPeriod) || {};
        const credits = groupPlanCreditGrants(plan.includedCreditGrants);
        const hasUsageBasedEntitlements = plan.entitlements.some(
          (entitlement) => !!entitlement.priceBehavior,
        );
        const isFreePlan = planPrice === 0;
        const isUsageBasedPlan = isFreePlan && hasUsageBasedEntitlements;
        const headerPriceFontStyle = settings.theme.typography.heading2;

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
                      : isFreePlan && showZeroPriceAsFree
                        ? t("Free")
                        : showAsMonthlyPrices &&
                            planPeriod === PriceInterval.Year
                          ? formatCurrency((planPrice ?? 0) / 12, {
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
                    {showAsMonthlyPrices && planPeriod === PriceInterval.Year
                      ? t("month, billed yearly")
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
                    const planCreditGrant = plan.includedCreditGrants?.find(
                      (grant) => grant.creditId === credit.id,
                    );
                    const hasAutoTopup =
                      planCreditGrant?.billingCreditAutoTopupEnabled;

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

                          <Flex $alignItems="baseline" $alignSelf="center">
                            <Text>
                              {credit.quantity}{" "}
                              {getFeatureName(credit, credit.quantity)}
                              {credit.period && (
                                <>
                                  {" "}
                                  {t("per")} {credit.period}
                                </>
                              )}
                            </Text>

                            {hasAutoTopup && (
                              <Tooltip
                                trigger={
                                  <Icon
                                    title="auto top-up"
                                    name="info-rounded"
                                    color={`hsla(0, 0%, ${isLightBackground ? 0 : 100}%, 0.5)`}
                                  />
                                }
                                content={
                                  <Text
                                    $size={
                                      0.875 *
                                      settings.theme.typography.text.fontSize
                                    }
                                  >
                                    {typeof planCreditGrant.billingCreditAutoTopupThresholdPercent ===
                                      "number" &&
                                      typeof planCreditGrant.billingCreditAutoTopupAmount ===
                                        "number" &&
                                      t(
                                        "When balance reaches X remaining, an auto top-up of Y credits will be processed.",
                                        {
                                          threshold:
                                            (planCreditGrant.billingCreditAutoTopupThresholdPercent /
                                              100) *
                                            credit.quantity,
                                          amount:
                                            planCreditGrant.billingCreditAutoTopupAmount,
                                        },
                                      )}
                                  </Text>
                                }
                                portal={tooltipPortal}
                              />
                            )}
                          </Flex>
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
              {plan.entitlements.length > 0 && (
                <Flex $flexDirection="column" $gap="1rem" $flexGrow={1}>
                  {plan.entitlements
                    .map((entitlement, entitlementIndex) => {
                      return (
                        <Entitlement
                          key={entitlementIndex}
                          entitlement={entitlement}
                          period={planPeriod}
                          credits={credits}
                          tooltipPortal={tooltipPortal}
                        />
                      );
                    })
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
