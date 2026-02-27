import { useTranslation } from "react-i18next";

import {
  EntitlementPriceBehavior,
  FeatureType,
} from "../../../api/checkoutexternal";
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
import { Box, Text } from "../../ui";

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
      priceBehavior === EntitlementPriceBehavior.PayInAdvance &&
      isTieredPrice(entitlementPrice);

    return (
      <>
        <Box>
          <Text display="heading4">
            {priceBehavior === EntitlementPriceBehavior.PayInAdvance ? (
              <>
                {quantity} {getFeatureName(feature, quantity)}
              </>
            ) : priceBehavior === EntitlementPriceBehavior.Overage &&
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
          {priceBehavior === EntitlementPriceBehavior.PayInAdvance &&
          !tiered ? (
            <Text>
              {formatCurrency((price ?? 0) * quantity, currency)}
              <sub>/{shortenPeriod(planPeriod)}</sub>
            </Text>
          ) : priceBehavior === EntitlementPriceBehavior.PayAsYouGo ||
            priceBehavior === EntitlementPriceBehavior.Overage ? (
            <Text>
              {priceBehavior === EntitlementPriceBehavior.Overage && (
                <>{t("then")} </>
              )}
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
            (priceBehavior === EntitlementPriceBehavior.Tier || tiered) && (
              <Text
                style={{ opacity: 0.54 }}
                $size={0.875 * settings.theme.typography.text.fontSize}
                $color={settings.theme.typography.text.color}
              >
                {t("Tier-based")}
                <PricingTiersTooltip
                  feature={feature}
                  period={planPeriod}
                  currency={currency}
                  priceTiers={priceTiers}
                  tiersMode={tiersMode ?? undefined}
                  portal={tooltipPortal}
                  position="left"
                />
              </Text>
            )
          )}
        </Box>
      </>
    );
  }
};
