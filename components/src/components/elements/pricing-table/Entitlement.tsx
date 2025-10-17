import { useTranslation } from "react-i18next";

import { type PlanEntitlementResponseData } from "../../../api/checkoutexternal";
import {
  EntitlementValueType,
  FeatureType,
  PriceBehavior,
  PriceInterval,
} from "../../../const";
import { useEmbed, useIsLightBackground } from "../../../hooks";
import type { Credit } from "../../../types";
import {
  formatCurrency,
  formatNumber,
  getCreditBasedEntitlementLimit,
  getEntitlementPrice,
  getFeatureName,
  getMetricPeriodName,
  shortenPeriod,
} from "../../../utils";
import {
  BillingThresholdTooltip,
  PricingTiersTooltip,
  TieredPricingDetails,
} from "../../shared";
import { Flex, Icon, Text } from "../../ui";

import {
  type PricingTableOptions,
  type PricingTableProps,
} from "./PricingTable";

export interface EntitlementProps {
  entitlement: PlanEntitlementResponseData;
  sharedProps: PricingTableOptions & {
    layout: PricingTableProps;
  };
  selectedPeriod?: string;
  credits?: Credit[];
  showCredits?: boolean;
}

export const Entitlement = ({
  entitlement,
  sharedProps,
  selectedPeriod = PriceInterval.Month,
  credits = [],
  showCredits = true,
}: EntitlementProps) => {
  const { layout } = sharedProps;

  const { t } = useTranslation();

  const { settings } = useEmbed();

  const isLightBackground = useIsLightBackground();

  const {
    price: entitlementPrice,
    priceTier: entitlementPriceTiers,
    currency: entitlementCurrency,
    packageSize: entitlementPackageSize = 1,
  } = getEntitlementPrice(entitlement, selectedPeriod) || {};

  const limit = entitlement.softLimit ?? entitlement.valueNumeric ?? undefined;

  const metricPeriodName = getMetricPeriodName(entitlement);
  const creditBasedEntitlementLimit = getCreditBasedEntitlementLimit(
    entitlement,
    credits,
  );

  return (
    <Flex $gap="1rem">
      {layout.plans.showFeatureIcons && entitlement.feature?.icon && (
        <Icon
          data-testid="sch-feature-icon"
          name={entitlement.feature.icon}
          color={settings.theme.primary}
          background={`color-mix(in oklch, ${settings.theme.card.background} 87.5%, ${isLightBackground ? "black" : "white"})`}
          rounded
        />
      )}

      {entitlement.feature?.name && (
        <Flex $flexDirection="column" $gap="0.5rem">
          <Flex $flexDirection="column" $justifyContent="center" $flexGrow={1}>
            <Text>
              {typeof entitlementPrice === "number" &&
              (entitlement.priceBehavior === PriceBehavior.PayInAdvance ||
                entitlement.priceBehavior === PriceBehavior.PayAsYouGo) ? (
                <>
                  {formatCurrency(entitlementPrice, entitlementCurrency)}{" "}
                  {t("per")}{" "}
                  {entitlementPackageSize > 1 && (
                    <>{formatNumber(entitlementPackageSize)} </>
                  )}
                  {getFeatureName(entitlement.feature, entitlementPackageSize)}
                  {entitlement.priceBehavior === PriceBehavior.PayInAdvance && (
                    <>
                      {" "}
                      {t("per")} {selectedPeriod}
                    </>
                  )}
                </>
              ) : entitlement.priceBehavior === PriceBehavior.Tiered ? (
                <TieredPricingDetails
                  entitlement={entitlement}
                  period={selectedPeriod}
                />
              ) : showCredits &&
                entitlement.priceBehavior === PriceBehavior.Credit &&
                entitlement.valueCredit &&
                entitlement.consumptionRate ? (
                <>
                  {formatNumber(entitlement.consumptionRate)}{" "}
                  {getFeatureName(
                    entitlement.valueCredit,
                    entitlement.consumptionRate,
                  )}{" "}
                  {t("per")} {getFeatureName(entitlement.feature, 1)}
                </>
              ) : entitlement.priceBehavior === PriceBehavior.Credit &&
                creditBasedEntitlementLimit ? (
                <>
                  {creditBasedEntitlementLimit?.period
                    ? t("Up to X units per period", {
                        amount: formatNumber(creditBasedEntitlementLimit.limit),
                        units: getFeatureName(
                          entitlement.feature,
                          creditBasedEntitlementLimit.limit,
                        ),
                        period: creditBasedEntitlementLimit.period,
                      })
                    : t("Up to X units", {
                        amount: formatNumber(creditBasedEntitlementLimit.limit),
                        units: getFeatureName(
                          entitlement.feature,
                          creditBasedEntitlementLimit.limit,
                        ),
                      })}
                </>
              ) : entitlement.valueType === EntitlementValueType.Numeric ||
                entitlement.valueType === EntitlementValueType.Unlimited ||
                entitlement.valueType === EntitlementValueType.Trait ? (
                <>
                  {entitlement.valueType === EntitlementValueType.Unlimited &&
                  !entitlement.priceBehavior ? (
                    t("Unlimited", {
                      item: getFeatureName(entitlement.feature),
                    })
                  ) : (
                    <>
                      {typeof limit === "number" && <>{formatNumber(limit)} </>}
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
              ) : (
                entitlement.feature.name
              )}
            </Text>

            <Flex $alignItems="end">
              {entitlement.priceBehavior === PriceBehavior.Overage &&
              typeof entitlementPrice === "number" ? (
                <Text
                  $size={0.875 * settings.theme.typography.text.fontSize}
                  $color={`color-mix(in oklch, ${settings.theme.typography.text.color}, ${settings.theme.card.background})`}
                >
                  {t("then")}{" "}
                  {formatCurrency(entitlementPrice, entitlementCurrency)}/
                  {entitlementPackageSize > 1 && (
                    <>{formatNumber(entitlementPackageSize)} </>
                  )}
                  {getFeatureName(entitlement.feature, entitlementPackageSize)}
                  {entitlement.feature.featureType === FeatureType.Trait && (
                    <>/{shortenPeriod(selectedPeriod)}</>
                  )}
                </Text>
              ) : (
                entitlement.priceBehavior === PriceBehavior.Tiered && (
                  <Flex $alignItems="end">
                    <Text
                      style={{ opacity: 0.54 }}
                      $size={0.875 * settings.theme.typography.text.fontSize}
                      $color={settings.theme.typography.text.color}
                    >
                      {t("Tier-based")}
                    </Text>

                    <PricingTiersTooltip
                      feature={entitlement.feature}
                      period={selectedPeriod}
                      currency={entitlementCurrency}
                      priceTiers={entitlementPriceTiers}
                    />
                  </Flex>
                )
              )}

              {entitlement.billingThreshold && (
                <BillingThresholdTooltip
                  billingThreshold={entitlement.billingThreshold}
                />
              )}
            </Flex>
          </Flex>

          {layout.plans.showFeatureDescriptions &&
            entitlement.feature?.description && (
              <Text
                $size={0.875 * settings.theme.typography.text.fontSize}
                $color={`color-mix(in oklch, ${settings.theme.typography.text.color}, ${settings.theme.card.background})`}
              >
                {entitlement.feature.description}
              </Text>
            )}
        </Flex>
      )}
    </Flex>
  );
};
