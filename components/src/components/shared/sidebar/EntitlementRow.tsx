import { useTranslation } from "react-i18next";

import { FeatureType, PriceBehavior } from "../../../const";
import { useEmbed } from "../../../hooks";
import {
  type CurrentUsageBasedEntitlement,
  type UsageBasedEntitlement,
} from "../../../types";
import {
  darken,
  formatCurrency,
  getEntitlementPrice,
  getFeatureName,
  hexToHSL,
  lighten,
  shortenPeriod,
} from "../../../utils";
import { PricingTiersTooltip } from "../../shared";
import { Box, Flex, Text } from "../../ui";

export const EntitlementRow = (
  entitlement: (UsageBasedEntitlement | CurrentUsageBasedEntitlement) & {
    planPeriod: string;
  },
) => {
  const { t } = useTranslation();

  const { settings } = useEmbed();

  const { feature, priceBehavior, quantity, softLimit, planPeriod } =
    entitlement;

  if (feature) {
    const {
      price,
      currency,
      packageSize = 1,
      priceTier: priceTiers,
    } = getEntitlementPrice(entitlement, planPeriod) || {};

    return (
      <>
        <Box>
          <Text display="heading4">
            {priceBehavior === PriceBehavior.PayInAdvance ? (
              <>
                {quantity} {getFeatureName(feature, quantity)}
              </>
            ) : priceBehavior === PriceBehavior.Overage &&
              typeof softLimit === "number" ? (
              <>
                {softLimit} {getFeatureName(feature, softLimit)}
              </>
            ) : (
              feature.name
            )}
          </Text>
        </Box>

        <Box $whiteSpace="nowrap">
          {priceBehavior === PriceBehavior.PayInAdvance ? (
            <Text>
              {formatCurrency((price ?? 0) * quantity, currency)}
              <sub>/{shortenPeriod(planPeriod)}</sub>
            </Text>
          ) : priceBehavior === PriceBehavior.PayAsYouGo ||
            priceBehavior === PriceBehavior.Overage ? (
            <Text>
              {priceBehavior === PriceBehavior.Overage && <>{t("then")} </>}
              {formatCurrency(price ?? 0, currency)}
              <sub>
                /{packageSize > 1 && <>{packageSize} </>}
                {getFeatureName(feature, packageSize)}
                {feature.featureType === FeatureType.Trait && (
                  <>/{shortenPeriod(planPeriod)}</>
                )}
              </sub>
            </Text>
          ) : (
            priceBehavior === PriceBehavior.Tiered && (
              <Flex $alignItems="center">
                <PricingTiersTooltip
                  feature={feature}
                  period={planPeriod}
                  currency={currency}
                  priceTiers={priceTiers}
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
        </Box>
      </>
    );
  }
};
