import { Fragment, useMemo } from "react";
import { useTranslation } from "react-i18next";

import { type FeatureUsageResponseData } from "../../../api/checkoutexternal";
import { FeatureType, PriceBehavior } from "../../../const";
import { type FontStyle } from "../../../context";
import { useEmbed } from "../../../hooks";
import {
  formatCurrency,
  getEntitlementPrice,
  getFeatureName,
  getUsageDetails,
  shortenPeriod,
} from "../../../utils";
import { OverageTooltip, PricingTiersTooltip } from "../../shared";
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
    amount = 0,
    cost = 0,
  } = useMemo(
    () => getUsageDetails(entitlement, period),
    [entitlement, period],
  );

  const description = useMemo(() => {
    const acc: React.ReactNode[] = [];

    let index = 0;

    if (entitlement.priceBehavior === PriceBehavior.Overage) {
      acc.push(
        amount > 0 ? (
          <Fragment key={index}>
            {t("X additional", {
              amount: amount,
            })}
          </Fragment>
        ) : (
          <Fragment key={index}>{t("Additional")}: </Fragment>
        ),
      );

      index += 1;
    }

    const { price } = getEntitlementPrice(entitlement, period) || {};

    if (
      entitlement.priceBehavior !== PriceBehavior.Tiered &&
      entitlement.feature &&
      typeof price === "number" &&
      !amount
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
      entitlement.priceBehavior === PriceBehavior.Credit &&
      entitlement.planEntitlement?.consumptionRate &&
      entitlement.planEntitlement?.valueCredit
    ) {
      const creditAmount = entitlement.planEntitlement.consumptionRate * amount;
      acc.push(
        creditAmount > 0 ? (
          <Fragment key={index}>
            {creditAmount}{" "}
            {getFeatureName(
              entitlement.planEntitlement.valueCredit,
              creditAmount,
            )}{" "}
            {t("used")}
          </Fragment>
        ) : (
          <Fragment key={index}>
            {entitlement.planEntitlement.consumptionRate}{" "}
            {getFeatureName(
              entitlement.planEntitlement.valueCredit,
              entitlement.planEntitlement.consumptionRate,
            )}{" "}
            {t("per")} {t("use")}
          </Fragment>
        ),
      );

      index += 1;
    }

    return acc;
  }, [t, period, showCredits, entitlement, billingPrice, amount]);

  if (
    (entitlement.priceBehavior === PriceBehavior.Credit && !showCredits) ||
    !entitlement.feature?.name
  ) {
    return null;
  }

  const quantity =
    entitlement.priceBehavior !== PriceBehavior.Credit
      ? limit || amount
      : undefined;

  return (
    <Flex
      $justifyContent="space-between"
      $alignItems="center"
      $flexWrap="wrap"
      $gap="0.5rem"
    >
      <Text display={layout.addOns.fontStyle}>
        {typeof quantity === "number" && quantity > 0 ? (
          <>
            {quantity} {entitlement.feature.name}
          </>
        ) : (
          entitlement.feature.name
        )}
      </Text>

      <Flex $alignItems="center" $gap="0.5rem">
        {description.length > 0 && (
          <Text
            style={{ opacity: 0.54 }}
            $size={0.875 * settings.theme.typography.text.fontSize}
            $color={settings.theme.typography.text.color}
          >
            {description}
          </Text>
        )}

        {(cost > 0 || entitlement.priceBehavior === PriceBehavior.Tiered) && (
          <Flex $alignItems="baseline">
            <Text>
              {formatCurrency(cost, billingPrice?.currency)}
              {entitlement.feature.featureType === FeatureType.Trait && (
                <sub>/{shortenPeriod(period)}</sub>
              )}
            </Text>

            {entitlement.priceBehavior === PriceBehavior.Overage ? (
              <OverageTooltip
                feature={entitlement.feature}
                limit={entitlement.allocation}
              />
            ) : (
              entitlement.priceBehavior === PriceBehavior.Tiered && (
                <PricingTiersTooltip
                  feature={entitlement.feature}
                  period={period}
                  currency={billingPrice?.currency}
                  priceTiers={billingPrice?.priceTier}
                />
              )
            )}
          </Flex>
        )}
      </Flex>
    </Flex>
  );
};
