import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import {
  EntitlementValueType,
  type PlanEntitlementResponseData,
} from "../../../../api/checkoutexternal";
import { FeatureType, PriceBehavior } from "../../../../const";
import { useEmbed, useIsLightBackground } from "../../../../hooks";
import type { Credit } from "../../../../types";
import {
  formatCurrency,
  formatNumber,
  getCreditBasedEntitlementLimit,
  getEntitlementPrice,
  getFeatureName,
  getMetricPeriodName,
  isTieredPrice,
  shortenPeriod,
} from "../../../../utils";
import {
  BillingThresholdTooltip,
  PricingTiersTooltip,
  TieredPricingDetails,
} from "../../../shared";
import { Flex, Icon, Text, Tooltip } from "../../../ui";

export interface EntitlementProps {
  entitlement: PlanEntitlementResponseData;
  period: string;
  credits: Credit[];
  tooltipPortal?: HTMLElement | null;
}

export const Entitlement = ({
  entitlement,
  period,
  credits,
  tooltipPortal,
}: EntitlementProps) => {
  const { t } = useTranslation();

  const { data, settings } = useEmbed();

  const isLightBackground = useIsLightBackground();

  const showCredits = data?.displaySettings?.showCredits ?? true;
  const showFeatureDescription =
    data?.displaySettings.showFeatureDescription ?? false;

  const secondaryTextSize = 0.875 * settings.theme.typography.text.fontSize;
  const secondaryTextColor = `color-mix(in oklch, ${settings.theme.typography.text.color} 62.5%, ${settings.theme.card.background})`;

  const entitlementBillingPrice = getEntitlementPrice(entitlement, period);
  const {
    price,
    priceTier,
    currency,
    packageSize = 1,
    tiersMode,
  } = entitlementBillingPrice || {};

  const tiered =
    entitlement.priceBehavior === PriceBehavior.PayInAdvance &&
    isTieredPrice(entitlementBillingPrice);

  const text = useMemo(() => {
    if (!entitlement.feature) {
      return;
    }

    const hasNumericValue =
      entitlement.valueType === EntitlementValueType.Numeric ||
      entitlement.valueType === EntitlementValueType.Unlimited ||
      entitlement.valueType === EntitlementValueType.Trait;

    const limit = entitlement.softLimit ?? entitlement.valueNumeric;
    const creditBasedEntitlementLimit = getCreditBasedEntitlementLimit(
      entitlement,
      credits,
    );

    const metricPeriodName = getMetricPeriodName(entitlement);

    if (
      typeof price === "number" &&
      !tiered &&
      (entitlement.priceBehavior === PriceBehavior.PayInAdvance ||
        entitlement.priceBehavior === PriceBehavior.PayAsYouGo)
    ) {
      return (
        <>
          {formatCurrency(price, currency)} {t("per")}{" "}
          {packageSize > 1 && <>{packageSize} </>}
          {getFeatureName(entitlement.feature, packageSize)}
          {entitlement.priceBehavior === PriceBehavior.PayInAdvance && (
            <>
              {" "}
              {t("per")} {period}
            </>
          )}
        </>
      );
    }

    if (entitlement.priceBehavior === PriceBehavior.Tiered || tiered) {
      return <TieredPricingDetails entitlement={entitlement} period={period} />;
    }

    if (
      showCredits &&
      entitlement.priceBehavior === PriceBehavior.Credit &&
      entitlement.valueCredit
    ) {
      return (
        <>
          {entitlement.consumptionRate}{" "}
          {getFeatureName(
            entitlement.valueCredit,
            entitlement.consumptionRate || undefined,
          )}{" "}
          {t("per")} {getFeatureName(entitlement.feature, 1)}
        </>
      );
    }

    if (
      entitlement.priceBehavior === PriceBehavior.Credit &&
      creditBasedEntitlementLimit
    ) {
      return (
        <>
          {creditBasedEntitlementLimit?.period
            ? t("Up to X units per period", {
                amount: creditBasedEntitlementLimit.limit,
                units: getFeatureName(
                  entitlement.feature,
                  creditBasedEntitlementLimit.limit,
                ),
                period: creditBasedEntitlementLimit.period,
              })
            : t("Up to X units", {
                amount: creditBasedEntitlementLimit.limit,
                units: getFeatureName(
                  entitlement.feature,
                  creditBasedEntitlementLimit.limit,
                ),
              })}
        </>
      );
    }

    if (hasNumericValue) {
      return (
        <>
          {entitlement.valueType === EntitlementValueType.Unlimited &&
          !entitlement.priceBehavior
            ? t("Unlimited", {
                item: getFeatureName(entitlement.feature),
              })
            : typeof limit === "number" && (
                <>
                  {formatNumber(limit)}{" "}
                  {getFeatureName(entitlement.feature, limit)}
                </>
              )}

          {metricPeriodName && (
            <>
              {" "}
              {t("per")} {t(metricPeriodName)}
            </>
          )}
        </>
      );
    }

    return entitlement.feature.name;
  }, [
    t,
    entitlement,
    period,
    credits,
    showCredits,
    price,
    currency,
    packageSize,
    tiered,
  ]);

  const usageText = useMemo(() => {
    if (!entitlement.feature) {
      return;
    }

    if (
      entitlement.priceBehavior === PriceBehavior.Overage &&
      typeof price === "number"
    ) {
      return (
        <>
          {t("then")} {formatCurrency(price, currency)}/
          {packageSize > 1 && <>{packageSize} </>}
          {getFeatureName(entitlement.feature, packageSize)}
          {entitlement.feature.featureType === FeatureType.Trait && (
            <>/{shortenPeriod(period)}</>
          )}
        </>
      );
    }

    if (entitlement.priceBehavior === PriceBehavior.Tiered || tiered) {
      return t("Tier-based");
    }
  }, [t, entitlement, period, price, currency, packageSize, tiered]);

  return (
    <Flex
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
          <Flex $flexDirection="column" $justifyContent="center" $gap="0.5rem">
            <Flex $flexDirection="column">
              <Text>{text}</Text>

              <Flex $alignItems="end">
                <Text $size={secondaryTextSize} $color={secondaryTextColor}>
                  {usageText}
                </Text>

                {(entitlement.priceBehavior === PriceBehavior.Tiered ||
                  tiered) && (
                  <PricingTiersTooltip
                    feature={entitlement.feature}
                    period={period}
                    currency={currency}
                    priceTiers={priceTier}
                    tiersMode={tiersMode ?? undefined}
                    portal={tooltipPortal}
                  />
                )}

                {entitlement.priceBehavior === PriceBehavior.Overage &&
                  typeof entitlement.valueNumeric === "number" &&
                  typeof entitlement.feature !== "undefined" && (
                    <Tooltip
                      trigger={
                        <Icon
                          title="overage pricing"
                          name="info-rounded"
                          color={`hsla(0, 0%, ${isLightBackground ? 0 : 100}%, 0.5)`}
                        />
                      }
                      content={
                        <Text>
                          {t("Up to a limit of", {
                            amount: entitlement.valueNumeric,
                            units: getFeatureName(
                              entitlement.feature,
                              entitlement.valueNumeric,
                            ),
                          })}
                        </Text>
                      }
                      portal={tooltipPortal}
                    />
                  )}

                {entitlement.billingThreshold && (
                  <BillingThresholdTooltip
                    billingThreshold={entitlement.billingThreshold}
                    portal={tooltipPortal}
                  />
                )}
              </Flex>
            </Flex>

            {showFeatureDescription && entitlement.feature.description && (
              <Text $size={secondaryTextSize} $color={secondaryTextColor}>
                {entitlement.feature.description}
              </Text>
            )}
          </Flex>
        )}
      </Flex>
    </Flex>
  );
};
