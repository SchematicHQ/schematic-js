import { useTranslation } from "react-i18next";

import { type FeatureUsageResponseData } from "../../../api/checkoutexternal";
import { FeatureType, PriceBehavior, TEXT_BASE_SIZE } from "../../../const";
import { useEmbed, useIsLightBackground } from "../../../hooks";
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
  const { t } = useTranslation();

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
        ? Number(currentTier?.perUnitPriceDecimal)
        : currentTier?.perUnitPrice,
  };

  if (
    typeof feature === "undefined" ||
    typeof currentTierPerUnitPrice !== "number"
  ) {
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
      {priceBehavior === PriceBehavior.Overage ? (
        <Text>
          {t("Additional")}: {formatCurrency(currentTierPerUnitPrice, currency)}
          <Box as="sub" $whiteSpace="nowrap">
            /{packageSize > 1 && <>{packageSize} </>}
            {getFeatureName(feature, packageSize)}
            {feature.featureType === FeatureType.Trait && period && (
              <>/{shortenPeriod(period)}</>
            )}
          </Box>
        </Text>
      ) : (
        priceBehavior === PriceBehavior.Tiered && (
          <Flex $alignItems="center" $gap="0.5rem">
            <Text>
              {t("Tier")}: {currentTier?.from || 1}
              {typeof currentTier?.to === "number" &&
                (currentTier.to === Infinity ? "+" : `–${currentTier.to}`)}
            </Text>
            <PricingTiersTooltip
              period={period}
              feature={feature}
              currency={currency}
              priceTiers={priceTiers}
              tiersMode={tiersMode}
            />
          </Flex>
        )
      )}

      {typeof amount === "number" && (
        <>
          {priceBehavior === PriceBehavior.Overage ? (
            <Text>
              {formatNumber(amount)} {getFeatureName(feature, amount)}
              {" · "}
              {formatCurrency(currentTierPerUnitPrice * amount, currency)}
              {feature.featureType === FeatureType.Trait &&
                typeof period === "string" && (
                  <Box as="sub" $whiteSpace="nowrap">
                    /{shortenPeriod(period)}
                  </Box>
                )}
            </Text>
          ) : (
            priceBehavior === PriceBehavior.Tiered &&
            typeof cost === "number" && (
              <Text>
                {formatCurrency(cost, currency)}
                {feature.featureType === FeatureType.Trait &&
                  typeof period === "string" && (
                    <Box as="sub" $whiteSpace="nowrap">
                      /{shortenPeriod(period)}
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
