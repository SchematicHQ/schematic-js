import { Fragment, useMemo } from "react";
import { useTranslation } from "react-i18next";

import {
  EntitlementPriceBehavior,
  EntitlementValueType,
  FeatureType,
  type FeatureUsageResponseData,
} from "../../../api/checkoutexternal";
import { type FontStyle } from "../../../context";
import { useEmbed } from "../../../hooks";
import {
  entitlementHasHardLimit,
  formatCurrency,
  getEntitlementPrice,
  getFeatureName,
  getUsageDetails,
  shortenPeriod,
} from "../../../utils";
import { HardLimitTooltip, PricingTiersTooltip } from "../../shared";
import { Flex, Text } from "../../ui";

export interface UsageDetailsProps {
  entitlement: FeatureUsageResponseData;
  period: string;
  showCredits: boolean;
  layout: {
    addOns: {
      isVisible: boolean;
      fontStyle: FontStyle;
      showLabel: boolean;
    };
  };
}

export const UsageDetails = ({
  entitlement,
  period,
  showCredits,
  layout,
}: UsageDetailsProps) => {
  const { t } = useTranslation();

  const { settings } = useEmbed();

  const {
    billingPrice,
    limit,
    cost = 0,
  } = useMemo(
    () => getUsageDetails(entitlement, period),
    [entitlement, period],
  );

  const description = useMemo(() => {
    const acc: React.ReactNode[] = [];

    let index = 0;

    if (entitlement.priceBehavior === EntitlementPriceBehavior.Overage) {
      acc.push(<Fragment key={index}>{t("Additional")}: </Fragment>);
      index += 1;
    }

    if (entitlement.priceBehavior === EntitlementPriceBehavior.Tier) {
      acc.push(<Fragment key={index}>{t("Tier-based")}</Fragment>);
      index += 1;
    }

    const { price } = getEntitlementPrice(entitlement, period) || {};

    if (
      (entitlement.priceBehavior === EntitlementPriceBehavior.PayAsYouGo ||
        entitlement.priceBehavior === EntitlementPriceBehavior.Overage) &&
      entitlement.feature &&
      typeof price === "number"
    ) {
      const packageSize = billingPrice?.packageSize ?? 1;
      acc.push(
        <Fragment key={index}>
          {formatCurrency(price, billingPrice?.currency)}
          <sub>
            /{packageSize > 1 && <>{packageSize} </>}
            {getFeatureName(entitlement.feature, packageSize)}
            {entitlement.feature.featureType === FeatureType.Trait && (
              <>/{shortenPeriod(period)}</>
            )}
          </sub>
        </Fragment>,
      );

      index += 1;
    }

    if (
      showCredits &&
      entitlement.priceBehavior === EntitlementPriceBehavior.CreditBurndown &&
      entitlement.planEntitlement?.consumptionRate &&
      entitlement.planEntitlement?.valueCredit
    ) {
      acc.push(
        <Fragment key={index}>
          {entitlement.planEntitlement.consumptionRate}{" "}
          {getFeatureName(
            entitlement.planEntitlement.valueCredit,
            entitlement.planEntitlement.consumptionRate,
          )}{" "}
          {t("per")} {t("use")}
        </Fragment>,
      );

      index += 1;
    }

    return acc;
  }, [
    t,
    period,
    showCredits,
    entitlement,
    billingPrice?.packageSize,
    billingPrice?.currency,
  ]);

  if (
    (entitlement.priceBehavior === EntitlementPriceBehavior.CreditBurndown &&
      !showCredits) ||
    !entitlement.feature?.name
  ) {
    return null;
  }

  const quantity =
    entitlement.priceBehavior !== EntitlementPriceBehavior.CreditBurndown
      ? limit
      : undefined;

  return (
    <Flex
      $justifyContent="space-between"
      $alignItems="center"
      $flexWrap="wrap"
      $gap="0.5rem"
    >
      <Text display={layout.addOns.fontStyle}>
        {typeof quantity === "number" ? (
          <>
            {quantity} {getFeatureName(entitlement.feature, quantity, true)}
          </>
        ) : (
          entitlement.feature.name
        )}
      </Text>

      <Text>
        {description.length > 0 && (
          <Text
            style={{ opacity: 0.54 }}
            $size={0.875 * settings.theme.typography.text.fontSize}
            $color={settings.theme.typography.text.color}
          >
            {description}
          </Text>
        )}
        {
          // only show cost for pay-in-advance entitlements
          // `description` will include price for other price behaviors
          entitlement.priceBehavior ===
            EntitlementPriceBehavior.PayInAdvance && (
            <>
              {" "}
              {formatCurrency(cost, billingPrice?.currency)}
              {entitlement.feature.featureType === FeatureType.Trait && (
                <sub>/{shortenPeriod(period)}</sub>
              )}
            </>
          )
        }
        {entitlement.priceBehavior === EntitlementPriceBehavior.Tier && (
          <PricingTiersTooltip
            feature={entitlement.feature}
            period={period}
            currency={billingPrice?.currency}
            priceTiers={billingPrice?.priceTier}
            tiersMode={billingPrice?.tiersMode ?? undefined}
          />
        )}
        {entitlementHasHardLimit(entitlement) &&
          entitlement.allocationType === EntitlementValueType.Numeric && (
            <HardLimitTooltip
              feature={entitlement.feature}
              limit={entitlement.allocation}
            />
          )}
      </Text>
    </Flex>
  );
};
