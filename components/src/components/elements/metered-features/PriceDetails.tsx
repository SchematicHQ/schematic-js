import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import {
  type BillingPriceView,
  type FeatureDetailResponseData,
} from "../../../api/checkoutexternal";
import { TEXT_BASE_SIZE } from "../../../const";
import { useEmbed, useIsLightBackground } from "../../../hooks";
import type { PriceTier } from "../../../types";
import {
  darken,
  formatCurrency,
  formatNumber,
  getFeatureName,
  lighten,
  shortenPeriod,
} from "../../../utils";
import { PricingTiersTooltip } from "../../shared";
import { Box, Flex, Text } from "../../ui";

interface PriceDetailsProps {
  period?: string;
  feature: FeatureDetailResponseData;
  priceBehavior: "overage" | "tier";
  amount?: number;
  billingPrice?: BillingPriceView;
  currentTier?: PriceTier;
}

export const PriceDetails = ({
  period,
  feature,
  priceBehavior,
  amount,
  billingPrice,
  currentTier,
}: PriceDetailsProps) => {
  const { t } = useTranslation();

  const { settings } = useEmbed();

  const isLightBackground = useIsLightBackground();

  const { currency, packageSize, priceTiers, tiersMode } = useMemo(() => {
    return {
      currency: billingPrice?.currency,
      packageSize: billingPrice?.packageSize ?? 1,
      priceTiers: billingPrice?.priceTier,
      tiersMode: billingPrice?.tiersMode || undefined,
    };
  }, [billingPrice]);

  if (
    typeof feature === "undefined" ||
    typeof currentTier?.perUnitPrice !== "number"
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
      {priceBehavior === "overage" ? (
        <Text>
          {t("Additional")}:{" "}
          {formatCurrency(currentTier.perUnitPrice, currency)}
          <Box as="sub" $whiteSpace="nowrap">
            /{packageSize > 1 && <>{packageSize} </>}
            {getFeatureName(feature, packageSize)}
            {feature.featureType === "trait" && period && (
              <>/{shortenPeriod(period)}</>
            )}
          </Box>
        </Text>
      ) : (
        priceBehavior === "tier" && (
          <Flex $alignItems="center">
            <Text>
              {t("Tiered")}: {currentTier.from ?? 0} - {currentTier.to}{" "}
            </Text>
            <PricingTiersTooltip
              featureName={feature.name}
              currency={currency}
              priceTiers={priceTiers}
              tiersMode={tiersMode}
              showMode
            />
          </Flex>
        )
      )}

      {typeof amount === "number" && (
        <>
          {priceBehavior === "overage" ? (
            <Text>
              {formatNumber(amount)} {getFeatureName(feature)}
              {" · "}
              {formatCurrency(currentTier.perUnitPrice * amount, currency)}
              {feature.featureType === "trait" &&
                typeof period === "string" && (
                  <Box as="sub" $whiteSpace="nowrap">
                    /{shortenPeriod(period)}
                  </Box>
                )}
            </Text>
          ) : (
            priceBehavior === "tier" && <Box>{/* TODO: price breakdown */}</Box>
          )}
        </>
      )}
    </Flex>
  );
};
