import { Fragment, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  CompanyPlanInvalidReason,
  EntitlementValueType,
  FeatureType,
  PriceBehavior,
  PriceInterval,
  TEXT_BASE_SIZE,
  VISIBLE_ENTITLEMENT_COUNT,
} from "../../../const";
import { useEmbed, useIsLightBackground } from "../../../hooks";
import type { SelectedPlan } from "../../../types";
import {
  entitlementCountsReducer,
  formatCurrency,
  formatNumber,
  getCreditBasedEntitlementLimit,
  getEntitlementPrice,
  getFeatureName,
  getMetricPeriodName,
  getPlanPrice,
  groupPlanCreditGrants,
  hexToHSL,
  shortenPeriod,
} from "../../../utils";
import { cardBoxShadow } from "../../layout";
import {
  BillingThresholdTooltip,
  PricingTiersTooltip,
  TieredPricingDetails,
  UsageViolationText,
} from "../../shared";
import { Box, Button, Flex, Icon, Text } from "../../ui";

import { FlexWithAlignEnd } from "./styles";

interface SelectedProps {
  isCurrent?: boolean;
  isTrial?: boolean;
}

const Selected = ({ isCurrent = false, isTrial = false }: SelectedProps) => {
  const { t } = useTranslation();

  const { settings } = useEmbed();

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
        {isCurrent
          ? isTrial
            ? t("Trial in progress")
            : t("Current plan")
          : isTrial
            ? t("Trial selected")
            : t("Plan selected")}
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
  shouldTrial?: boolean;
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

  const isTrialing = data?.subscription?.status === "trialing";
  const isCurrentPlan = data?.company?.plan?.id === plan.id;
  const isValidPlan = plan.valid;
  const isDowngradeNotPermitted =
    plan.invalidReason === CompanyPlanInvalidReason.DowngradeNotPermitted;
  const isDisabled =
    (isLoading || (!isValidPlan && !isDowngradeNotPermitted)) && !plan.custom;

  if (plan.companyCanTrial && plan.isTrialable) {
    return (
      <Flex $flexDirection="column" $gap="1.5rem">
        {!isTrialing && (
          <>
            {isSelected && shouldTrial ? (
              <Selected isCurrent={isCurrentPlan} isTrial={shouldTrial} />
            ) : (
              <Flex $flexDirection="column" $gap="0.5rem">
                <Button
                  type="button"
                  disabled={isDisabled}
                  {...(plan.custom
                    ? {
                        as: "a",
                        href: plan.customPlanConfig?.ctaWebSite ?? "#",
                        target: "_blank",
                        rel: "noreferrer",
                      }
                    : isDowngradeNotPermitted
                      ? {
                          as: "a",
                          href: data?.preventSelfServiceDowngradeUrl ?? "#",
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
                  {plan.custom
                    ? (plan.customPlanConfig?.ctaText ?? t("Talk to support"))
                    : isDowngradeNotPermitted
                      ? (data?.preventSelfServiceDowngradeButtonText ??
                        t("Talk to support"))
                      : !isValidPlan
                        ? t("Over plan limit")
                        : t("Start X day trial", { days: plan.trialDays })}
                </Button>

                {!isValidPlan && (
                  <UsageViolationText violations={plan.usageViolations} />
                )}
              </Flex>
            )}
          </>
        )}

        {!plan.custom && (
          <>
            {isSelected && (!shouldTrial || isTrialing) ? (
              <Selected isCurrent={isCurrentPlan} />
            ) : (
              <Flex $flexDirection="column" $gap="0.5rem">
                <Button
                  type="button"
                  disabled={isDisabled}
                  onClick={() => {
                    onSelect({ plan, shouldTrial: false });
                  }}
                  $size="sm"
                  $color="primary"
                  $variant={isTrialing ? "filled" : "text"}
                  $fullWidth
                >
                  {!isValidPlan ? t("Over plan limit") : t("Choose plan")}
                </Button>

                {!isValidPlan && (
                  <UsageViolationText violations={plan.usageViolations} />
                )}
              </Flex>
            )}
          </>
        )}
      </Flex>
    );
  }

  return isSelected ? (
    <Selected isCurrent={isCurrentPlan} />
  ) : (
    <Flex $flexDirection="column" $gap="0.5rem">
      <Button
        type="button"
        disabled={isDisabled}
        {...(plan.custom
          ? {
              as: "a",
              href: plan.customPlanConfig?.ctaWebSite ?? "#",
              target: "_blank",
              rel: "noreferrer",
            }
          : isDowngradeNotPermitted
            ? {
                as: "a",
                href: data?.preventSelfServiceDowngradeUrl ?? "#",
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
        {plan.custom
          ? (plan.customPlanConfig?.ctaText ?? t("Talk to support"))
          : isDowngradeNotPermitted
            ? (data?.preventSelfServiceDowngradeButtonText ??
              t("Talk to support"))
            : !isValidPlan
              ? t("Over plan limit")
              : t("Choose plan")}
      </Button>

      {!isValidPlan && <UsageViolationText violations={plan.usageViolations} />}
    </Flex>
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
                          ? formatCurrency((planPrice ?? 0) / 12, planCurrency)
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

                          <Flex
                            $flexDirection="column"
                            $justifyContent="center"
                            $gap="0.5rem"
                          >
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
                              <Text
                                $size={
                                  0.8125 *
                                  settings.theme.typography.text.fontSize
                                }
                                style={{ opacity: 0.7 }}
                              >
                                {typeof planCreditGrant.billingCreditAutoTopupThresholdPercent ===
                                "number"
                                  ? t("Auto-topup enabled at X%", {
                                      threshold:
                                        planCreditGrant.billingCreditAutoTopupThresholdPercent,
                                    })
                                  : t("Auto-topup enabled")}
                                {planCreditGrant.billingCreditAutoTopupAmount && (
                                  <>
                                    {" "}
                                    (+
                                    {
                                      planCreditGrant.billingCreditAutoTopupAmount
                                    }{" "}
                                    {getFeatureName(
                                      credit,
                                      planCreditGrant.billingCreditAutoTopupAmount,
                                    )}
                                    )
                                  </>
                                )}
                              </Text>
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
              {plan.entitlements.length > 0 && (
                <Flex $flexDirection="column" $gap="1rem" $flexGrow={1}>
                  {plan.entitlements
                    .map((entitlement, entitlementIndex) => {
                      const hasNumericValue =
                        entitlement.valueType ===
                          EntitlementValueType.Numeric ||
                        entitlement.valueType ===
                          EntitlementValueType.Unlimited ||
                        entitlement.valueType === EntitlementValueType.Trait;

                      const limit =
                        entitlement.softLimit ?? entitlement.valueNumeric;
                      const creditBasedEntitlementLimit =
                        getCreditBasedEntitlementLimit(entitlement, credits);

                      const {
                        price: entitlementPrice,
                        priceTier: entitlementPriceTiers,
                        currency: entitlementCurrency,
                        packageSize: entitlementPackageSize = 1,
                      } = getEntitlementPrice(entitlement, planPeriod) || {};

                      const metricPeriodName = getMetricPeriodName(entitlement);
                      const UsageDetailsContainer = entitlement.billingThreshold
                        ? FlexWithAlignEnd
                        : Fragment;

                      return (
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
                                <Text>
                                  {typeof entitlementPrice === "number" &&
                                  (entitlement.priceBehavior ===
                                    PriceBehavior.PayInAdvance ||
                                    entitlement.priceBehavior ===
                                      PriceBehavior.PayAsYouGo) ? (
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
                                        PriceBehavior.PayInAdvance && (
                                        <>
                                          {" "}
                                          {t("per")} {planPeriod}
                                        </>
                                      )}
                                    </>
                                  ) : entitlement.priceBehavior ===
                                    PriceBehavior.Tiered ? (
                                    <TieredPricingDetails
                                      entitlement={entitlement}
                                      period={planPeriod}
                                    />
                                  ) : showCredits &&
                                    entitlement.priceBehavior ===
                                      PriceBehavior.Credit &&
                                    entitlement.valueCredit ? (
                                    <>
                                      {entitlement.consumptionRate}{" "}
                                      {getFeatureName(
                                        entitlement.valueCredit,
                                        entitlement.consumptionRate ||
                                          undefined,
                                      )}{" "}
                                      {t("per")}{" "}
                                      {getFeatureName(entitlement.feature, 1)}
                                    </>
                                  ) : entitlement.priceBehavior ===
                                      PriceBehavior.Credit &&
                                    creditBasedEntitlementLimit ? (
                                    <>
                                      {creditBasedEntitlementLimit?.period
                                        ? t("Up to X units per period", {
                                            amount:
                                              creditBasedEntitlementLimit.limit,
                                            units: getFeatureName(
                                              entitlement.feature,
                                              creditBasedEntitlementLimit.limit,
                                            ),
                                            period:
                                              creditBasedEntitlementLimit.period,
                                          })
                                        : t("Up to X units", {
                                            amount:
                                              creditBasedEntitlementLimit.limit,
                                            units: getFeatureName(
                                              entitlement.feature,
                                              creditBasedEntitlementLimit.limit,
                                            ),
                                          })}
                                    </>
                                  ) : hasNumericValue ? (
                                    <>
                                      {entitlement.valueType ===
                                        EntitlementValueType.Unlimited &&
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

                                <UsageDetailsContainer>
                                  {entitlement.priceBehavior ===
                                    PriceBehavior.Overage &&
                                  typeof entitlementPrice === "number" ? (
                                    <Text
                                      style={{ opacity: 0.54 }}
                                      $size={
                                        0.875 *
                                        settings.theme.typography.text.fontSize
                                      }
                                      $color={
                                        settings.theme.typography.text.color
                                      }
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
                                        FeatureType.Trait && (
                                        <>/{shortenPeriod(planPeriod)}</>
                                      )}
                                    </Text>
                                  ) : (
                                    entitlement.priceBehavior ===
                                      PriceBehavior.Tiered && (
                                      <Flex $alignItems="end">
                                        <Text
                                          style={{ opacity: 0.54 }}
                                          $size={
                                            0.875 *
                                            settings.theme.typography.text
                                              .fontSize
                                          }
                                          $color={
                                            settings.theme.typography.text.color
                                          }
                                        >
                                          {t("Tier-based")}
                                        </Text>

                                        <PricingTiersTooltip
                                          feature={entitlement.feature}
                                          period={planPeriod}
                                          currency={entitlementCurrency}
                                          priceTiers={entitlementPriceTiers}
                                        />
                                      </Flex>
                                    )
                                  )}

                                  {entitlement.billingThreshold && (
                                    <BillingThresholdTooltip
                                      billingThreshold={
                                        entitlement.billingThreshold
                                      }
                                    />
                                  )}
                                </UsageDetailsContainer>
                              </Flex>
                            )}
                          </Flex>
                        </Flex>
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
                        $leading={1}
                        style={{ cursor: "pointer" }}
                      >
                        {isExpanded ? t("Hide all") : t("See all")}
                      </Text>
                    </Flex>
                  )}
                </Flex>
              )}

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
  );
};
