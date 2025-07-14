import { useTranslation } from "react-i18next";

import { type PlanEntitlementResponseData } from "../../../api/checkoutexternal";
import { PriceBehavior } from "../../../const";
import { useEmbed, useIsLightBackground } from "../../../hooks";
import {
  darken,
  formatCurrency,
  formatNumber,
  getEntitlementPrice,
  getFeatureName,
  getMetricPeriodName,
  hexToHSL,
  lighten,
  shortenPeriod,
} from "../../../utils";
import { PricingTiersTooltip, TieredPricingDetails } from "../../shared";
import { Flex, Icon, Text } from "../../ui";

import {
  type PricingTableOptions,
  type PricingTableProps,
} from "./PricingTable";

interface EntitlementProps {
  entitlement: PlanEntitlementResponseData;
  sharedProps: PricingTableOptions & {
    layout: PricingTableProps;
  };
  selectedPeriod: string;
}

export const Entitlement = ({
  entitlement,
  sharedProps,
  selectedPeriod,
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

  if (entitlement.priceBehavior && typeof entitlementPrice !== "number") {
    return null;
  }

  const limit = entitlement.softLimit ?? entitlement.valueNumeric;

  const metricPeriodName = getMetricPeriodName(entitlement);

  return (
    <Flex $gap="1rem">
      {layout.plans.showFeatureIcons && entitlement.feature?.icon && (
        <Icon
          name={entitlement.feature.icon}
          color={settings.theme.primary}
          background={`color-mix(in oklch, ${settings.theme.card.background} 87.5%, ${isLightBackground ? "black" : "white"})`}
          rounded
        />
      )}

      {entitlement.feature?.name && (
        <Flex $flexDirection="column" $justifyContent="center" $gap="0.5rem">
          <Text>
            {typeof entitlementPrice === "number" &&
            (entitlement.priceBehavior === PriceBehavior.PayInAdvance ||
              entitlement.priceBehavior === PriceBehavior.PayAsYouGo) ? (
              <>
                {formatCurrency(entitlementPrice, entitlementCurrency)}{" "}
                {t("per")}{" "}
                {entitlementPackageSize > 1 && <>{entitlementPackageSize} </>}
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
            ) : entitlement.valueType === "numeric" ||
              entitlement.valueType === "unlimited" ||
              entitlement.valueType === "trait" ? (
              <>
                {entitlement.valueType === "unlimited" &&
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
            ) : (
              entitlement.feature.name
            )}
          </Text>

          {entitlement.priceBehavior === PriceBehavior.Overage &&
          typeof entitlementPrice === "number" ? (
            <Text
              $size={0.875 * settings.theme.typography.text.fontSize}
              $color={`color-mix(in oklch, ${settings.theme.typography.text.color}, ${settings.theme.card.background})`}
            >
              {t("then")}{" "}
              {formatCurrency(entitlementPrice, entitlementCurrency)}/
              {entitlementPackageSize > 1 && <>{entitlementPackageSize} </>}
              {getFeatureName(entitlement.feature, entitlementPackageSize)}
              {entitlement.feature.featureType === "trait" && (
                <>/{shortenPeriod(selectedPeriod)}</>
              )}
            </Text>
          ) : (
            entitlement.priceBehavior === PriceBehavior.Tiered && (
              <Flex $alignItems="center">
                <PricingTiersTooltip
                  feature={entitlement.feature}
                  period={selectedPeriod}
                  currency={entitlementCurrency}
                  priceTiers={entitlementPriceTiers}
                />
                <Text
                  $size={0.875 * settings.theme.typography.text.fontSize}
                  $color={
                    hexToHSL(settings.theme.typography.text.color).l > 50
                      ? darken(settings.theme.typography.text.color, 0.46)
                      : lighten(settings.theme.typography.text.color, 0.46)
                  }
                >
                  {t("Tier-based")}
                </Text>
              </Flex>
            )
          )}
        </Flex>
      )}
    </Flex>
  );
};
