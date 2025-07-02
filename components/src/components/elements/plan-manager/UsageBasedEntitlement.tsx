import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { type FeatureUsageResponseData } from "../../../api/checkoutexternal";
import { type FontStyle } from "../../../context";
import { useEmbed } from "../../../hooks";
import {
  darken,
  formatCurrency,
  getFeatureName,
  getUsageBasedEntitlement,
  hexToHSL,
  lighten,
  shortenPeriod,
} from "../../../utils";
import { PricingTiersTooltip } from "../../shared";
import { Flex, Text } from "../../ui";

export interface UsageBasedEntitlementProps {
  fontStyle: FontStyle;
  entitlement: FeatureUsageResponseData;
  period: string;
}

export const UsageBasedEntitlement = ({
  fontStyle,
  entitlement,
  period,
}: UsageBasedEntitlementProps) => {
  const { t } = useTranslation();

  const { settings } = useEmbed();

  const usageBasedEntitlement = useMemo(
    () => getUsageBasedEntitlement(entitlement, period),
    [entitlement, period],
  );

  const description = useMemo(() => {
    const acc: React.ReactNode[] = [];

    if (usageBasedEntitlement.priceBehavior === "overage") {
      acc.push(
        usageBasedEntitlement.amount ? (
          t("X additional", {
            amount: usageBasedEntitlement.amount,
          })
        ) : (
          <>{t("Additional")}: </>
        ),
      );
    }

    const {
      price,
      currency,
      packageSize = 1,
    } = usageBasedEntitlement.billingPrice || {};

    if (
      ((usageBasedEntitlement.priceBehavior === "overage" &&
        !usageBasedEntitlement.amount) ||
        usageBasedEntitlement.priceBehavior !== "tier") &&
      price &&
      usageBasedEntitlement.feature
    ) {
      acc.push(
        <>
          {formatCurrency(price, currency)}
          <sub>
            /{packageSize > 1 && <>{packageSize} </>}
            {getFeatureName(usageBasedEntitlement.feature, packageSize)}
            {usageBasedEntitlement.feature.featureType === "trait" && (
              <>/{shortenPeriod(period)}</>
            )}
          </sub>
        </>,
      );
    }

    return acc;
  }, [
    t,
    period,
    usageBasedEntitlement.priceBehavior,
    usageBasedEntitlement.billingPrice,
    usageBasedEntitlement.feature,
    usageBasedEntitlement.amount,
  ]);

  // this should never be the case since there should always be an associated feature,
  // but we need to satisfy all possible cases
  if (!usageBasedEntitlement.feature?.name) {
    return null;
  }

  const quantity = usageBasedEntitlement.limit || usageBasedEntitlement.amount;

  return (
    <Flex
      $justifyContent="space-between"
      $alignItems="center"
      $flexWrap="wrap"
      $gap="1rem"
    >
      <Text display={fontStyle}>
        {quantity ? (
          <>
            {quantity} {getFeatureName(usageBasedEntitlement.feature, quantity)}
          </>
        ) : (
          getFeatureName(usageBasedEntitlement.feature)
        )}
      </Text>

      <Flex $alignItems="center" $gap="0.5rem">
        {description.length > 0 && (
          <Text
            $size={0.875 * settings.theme.typography.text.fontSize}
            $color={
              hexToHSL(settings.theme.typography.text.color).l > 50
                ? darken(settings.theme.typography.text.color, 0.46)
                : lighten(settings.theme.typography.text.color, 0.46)
            }
          >
            {description}
          </Text>
        )}

        {usageBasedEntitlement.priceBehavior === "tier" && (
          <PricingTiersTooltip
            featureName={usageBasedEntitlement.feature.name}
            priceTiers={usageBasedEntitlement.billingPrice?.priceTier}
            currency={usageBasedEntitlement.billingPrice?.currency}
          />
        )}

        {usageBasedEntitlement.cost && (
          <Text>
            {formatCurrency(
              usageBasedEntitlement.cost,
              usageBasedEntitlement.billingPrice?.currency,
            )}
            <sub>/{shortenPeriod(period)}</sub>
          </Text>
        )}
      </Flex>
    </Flex>
  );
};
