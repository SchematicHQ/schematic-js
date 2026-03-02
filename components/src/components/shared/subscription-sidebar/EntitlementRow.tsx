import { useTranslation } from "react-i18next";

import { FeatureType, PriceBehavior } from "../../../const";
import { useEmbed } from "../../../hooks";
import {
  type CurrentUsageBasedEntitlement,
  type UsageBasedEntitlement,
} from "../../../types";
import {
  formatCurrency,
  getEntitlementPrice,
  getFeatureName,
  isTieredPrice,
  shortenPeriod,
} from "../../../utils";
import { PricingTiersTooltip } from "../../shared";
import { Box, Flex, Text } from "../../ui";

export const EntitlementRow = (
  props: (UsageBasedEntitlement | CurrentUsageBasedEntitlement) & {
    planPeriod: string;
    tooltipPortal?: HTMLElement | null;
  },
) => {
  const { t } = useTranslation();

  const { settings } = useEmbed();

  const { tooltipPortal, ...entitlement } = props;
  const { feature, priceBehavior, quantity, softLimit, planPeriod } =
    entitlement;

  if (feature) {
    const entitlementPrice = getEntitlementPrice(entitlement, planPeriod);
    const {
      price,
      currency,
      packageSize = 1,
      priceTier: priceTiers,
      tiersMode,
    } = entitlementPrice || {};

    const tiered =
      priceBehavior === PriceBehavior.PayInAdvance &&
      isTieredPrice(entitlementPrice);

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
          {priceBehavior === PriceBehavior.PayInAdvance && !tiered ? (
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
            (priceBehavior === PriceBehavior.Tiered || tiered) && (
              <Flex $alignItems="baseline">
                <Text
                  style={{ opacity: 0.54 }}
                  $size={0.875 * settings.theme.typography.text.fontSize}
                  $color={settings.theme.typography.text.color}
                >
                  {t("Tier-based")}
                </Text>

                <PricingTiersTooltip
                  feature={feature}
                  period={planPeriod}
                  currency={currency}
                  priceTiers={priceTiers}
                  tiersMode={tiersMode ?? undefined}
                  portal={tooltipPortal}
                  position="left"
                />
              </Flex>
            )
          )}
        </Box>
      </>
    );
  }
};
