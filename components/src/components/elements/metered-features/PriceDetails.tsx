import {
  EntitlementPriceBehavior,
  FeatureType,
  type FeatureUsageResponseData,
} from "../../../api/checkoutexternal";
import { TEXT_BASE_SIZE } from "../../../const";
import { useEmbed, useIsLightBackground } from "../../../hooks";
import { useTranslation } from "../../../localization";
import {
  darken,
  formatCurrency,
  formatNumber,
  getFeatureName,
  lighten,
  shortenPeriod,
  type UsageDetails,
} from "../../../utils";
import { PricingTiersTooltip } from "../../shared";
import { Box, Flex, Text } from "../../ui";

interface PriceDetailsProps {
  entitlement: FeatureUsageResponseData;
  usageDetails: UsageDetails;
  period?: string;
}

export const PriceDetails = ({
  entitlement,
  usageDetails,
  period,
}: PriceDetailsProps) => {
  const { t, locale } = useTranslation();

  const { settings } = useEmbed();

  const isLightBackground = useIsLightBackground();

  const { feature, priceBehavior } = entitlement;
  const { amount, cost, billingPrice, currentTier } = usageDetails;
  const {
    currency,
    packageSize,
    priceTiers,
    tiersMode,
    currentTierPerUnitPrice,
  } = {
    currency: billingPrice?.currency,
    packageSize: billingPrice?.packageSize ?? 1,
    priceTiers: billingPrice?.priceTier,
    tiersMode: billingPrice?.tiersMode || undefined,
    currentTierPerUnitPrice:
      typeof currentTier?.perUnitPriceDecimal === "string"
        ? Number(currentTier.perUnitPriceDecimal)
        : currentTier?.perUnitPrice,
  };

  if (!feature || typeof currentTierPerUnitPrice !== "number") {
    return null;
  }

  return (
    <Flex
      $justifyContent="space-between"
      $alignItems="center"
      $gap="1rem"
      $margin={`0 -${settings.theme.card.padding / TEXT_BASE_SIZE}rem -${(settings.theme.card.padding * 0.75) / TEXT_BASE_SIZE}rem`}
      $padding={`${(0.4375 * settings.theme.card.padding) / TEXT_BASE_SIZE}rem ${settings.theme.card.padding / TEXT_BASE_SIZE}rem`}
      $backgroundColor={
        isLightBackground
          ? darken(settings.theme.card.background, 0.05)
          : lighten(settings.theme.card.background, 0.1)
      }
      {...(settings.theme.sectionLayout === "separate" && {
        $borderBottomLeftRadius: `${settings.theme.card.borderRadius / TEXT_BASE_SIZE}rem`,
        $borderBottomRightRadius: `${settings.theme.card.borderRadius / TEXT_BASE_SIZE}rem`,
      })}
    >
      {priceBehavior === EntitlementPriceBehavior.Overage ? (
        <Text>
          {t("Additional")}:{" "}
          {formatCurrency(currentTierPerUnitPrice, { locale, currency })}
          <Box as="sub" $whiteSpace="nowrap">
            /{packageSize > 1 && <>{packageSize} </>}
            {getFeatureName(feature, locale, packageSize)}
            {feature.featureType === FeatureType.Trait && period && (
              <>/{shortenPeriod(period, t)}</>
            )}
          </Box>
        </Text>
      ) : (
        priceBehavior === EntitlementPriceBehavior.Tier && (
          <Text>
            {t("Tier")}: {currentTier?.from || 1}
            {typeof currentTier?.to === "number" &&
              (currentTier.from || 1) !== currentTier.to && (
                <>{currentTier.to === Infinity ? "+" : `–${currentTier.to}`}</>
              )}
            <PricingTiersTooltip
              period={period}
              feature={feature}
              currency={currency}
              priceTiers={priceTiers}
              tiersMode={tiersMode}
            />
          </Text>
        )
      )}

      {typeof amount === "number" && (
        <>
          {priceBehavior === EntitlementPriceBehavior.Overage ? (
            <Text>
              {formatNumber(amount, { locale })}{" "}
              {getFeatureName(feature, locale, amount)}
              {" · "}
              {formatCurrency(currentTierPerUnitPrice * amount, {
                locale,
                currency,
              })}
              {feature.featureType === FeatureType.Trait &&
                typeof period === "string" && (
                  <Box as="sub" $whiteSpace="nowrap">
                    /{shortenPeriod(period, t)}
                  </Box>
                )}
            </Text>
          ) : (
            priceBehavior === EntitlementPriceBehavior.Tier &&
            typeof cost === "number" && (
              <Text>
                {formatCurrency(cost, { locale, currency })}
                {feature.featureType === FeatureType.Trait &&
                  typeof period === "string" && (
                    <Box as="sub" $whiteSpace="nowrap">
                      /{shortenPeriod(period, t)}
                    </Box>
                  )}
              </Text>
            )
          )}
        </>
      )}
    </Flex>
  );
};
