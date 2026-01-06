import { Fragment, useMemo } from "react";
import { useTranslation } from "react-i18next";

import { type FeatureUsageResponseData } from "../../../api/checkoutexternal";
import { FeatureType, PriceBehavior } from "../../../const";
import { type FontStyle } from "../../../context";
import { useEmbed } from "../../../hooks";
import {
  formatCurrency,
  formatNumber,
  getFeatureName,
  getUsageDetails,
  shortenPeriod,
  toPrettyDate,
} from "../../../utils";
import { PricingTiersTooltip } from "../../shared";
import { Box, Flex, Text } from "../../ui";

interface UsageDetailsProps {
  entitlement: FeatureUsageResponseData;
  shouldWrapChildren: boolean;
  layout: {
    entitlement: {
      isVisible: boolean;
      fontStyle: FontStyle;
    };
    usage: {
      isVisible: boolean;
      fontStyle: FontStyle;
    };
  };
}

export const UsageDetails = ({
  entitlement,
  shouldWrapChildren,
  layout,
}: UsageDetailsProps) => {
  const {
    allocation,
    allocationType,
    feature,
    planEntitlement,
    priceBehavior,
    usage,
    softLimit,
    metricResetAt,
  } = entitlement;

  const { t } = useTranslation();

  const { data } = useEmbed();

  const { period, showCredits } = useMemo(() => {
    return {
      period: data?.company?.plan?.planPeriod || undefined,
      showCredits: data?.displaySettings?.showCredits ?? true,
    };
  }, [data?.company?.plan?.planPeriod, data?.displaySettings?.showCredits]);

  const { price, priceTiers, currency, packageSize, limit, cost, currentTier } =
    useMemo(() => {
      const { billingPrice, amount, limit, cost, currentTier } =
        getUsageDetails(entitlement, period);
      const {
        price,
        priceTier,
        currency,
        packageSize = 1,
      } = billingPrice || {};

      return {
        price,
        priceTiers: priceTier,
        currency,
        packageSize,
        amount,
        limit,
        cost,
        currentTier,
      };
    }, [entitlement, period]);

  const text = useMemo(() => {
    if (!feature) {
      return;
    }

    if (
      priceBehavior === PriceBehavior.PayInAdvance &&
      typeof allocation === "number"
    ) {
      return t("X units", {
        amount: formatNumber(allocation),
        units: getFeatureName(feature, allocation),
      });
    }

    if (
      priceBehavior === PriceBehavior.PayAsYouGo &&
      typeof price === "number"
    ) {
      const formattedCost = formatCurrency(price, currency);
      const featureName = getFeatureName(feature, packageSize);

      return packageSize > 1
        ? t("$X per Y units", {
            cost: formattedCost,
            size: packageSize,
            units: featureName,
          })
        : t("$X per unit", { cost: formattedCost, unit: featureName });
    }

    if (
      priceBehavior === PriceBehavior.Overage &&
      typeof softLimit === "number"
    ) {
      return t("X units", {
        amount: formatNumber(softLimit),
        units: getFeatureName(feature, softLimit),
      });
    }

    if (priceBehavior === PriceBehavior.Tiered) {
      return (
        typeof currentTier?.to === "number" &&
        (currentTier?.to === Infinity
          ? t("Unlimited in this tier", {
              feature: getFeatureName(feature),
            })
          : t("Up to X units in this tier", {
              amount: formatNumber(currentTier.to),
              feature: getFeatureName(feature, currentTier?.to),
            }))
      );
    }

    if (
      showCredits &&
      priceBehavior === PriceBehavior.Credit &&
      planEntitlement?.valueCredit &&
      typeof planEntitlement?.consumptionRate === "number"
    ) {
      return t("X units per use", {
        amount: planEntitlement.consumptionRate,
        units: getFeatureName(
          planEntitlement.valueCredit,
          planEntitlement.consumptionRate,
        ),
      });
    }

    if (priceBehavior === PriceBehavior.Credit && typeof limit === "number") {
      return t("X units remaining", {
        amount: formatNumber(limit),
        units: getFeatureName(feature, limit),
      });
    }

    if (!priceBehavior && typeof allocation === "number") {
      return t("X units", {
        amount: formatNumber(allocation),
        units: getFeatureName(feature, allocation),
      });
    }

    if (!priceBehavior && allocationType === "unlimited") {
      return t("Unlimited", { item: getFeatureName(feature) });
    }
  }, [
    t,
    allocation,
    allocationType,
    feature,
    planEntitlement,
    currency,
    price,
    priceBehavior,
    packageSize,
    limit,
    softLimit,
    currentTier,
    showCredits,
  ]);

  const usageText = useMemo(() => {
    if (!feature) {
      return;
    }

    const acc: React.ReactNode[] = [];

    let index = 0;

    if (
      priceBehavior === PriceBehavior.PayInAdvance &&
      typeof period === "string" &&
      typeof price === "number"
    ) {
      acc.push(
        <Fragment key={index}>
          {packageSize > 1
            ? t("$X/Y units/period", {
                cost: formatCurrency(price, currency),
                size: packageSize,
                units: getFeatureName(feature, packageSize),
                period: shortenPeriod(period),
              })
            : t("$X/unit/period", {
                cost: formatCurrency(price, currency),
                unit: getFeatureName(feature, packageSize),
                period: shortenPeriod(period),
              })}
        </Fragment>,
      );

      index += 1;
    } else if (
      (priceBehavior === PriceBehavior.PayAsYouGo ||
        priceBehavior === PriceBehavior.Overage ||
        priceBehavior === PriceBehavior.Tiered ||
        priceBehavior === PriceBehavior.Credit) &&
      typeof usage === "number"
    ) {
      acc.push(
        <Fragment key={index}>
          {t("X units used", {
            amount: usage,
            units: getFeatureName(feature, usage),
          })}
        </Fragment>,
      );

      index += 1;
    }

    if (typeof cost === "number" && cost > 0) {
      acc.push(
        <Fragment key={index}>
          {acc.length > 0 && <> • </>}
          {formatCurrency(cost, currency)}
        </Fragment>,
      );

      index += 1;

      if (
        feature.featureType === FeatureType.Trait &&
        typeof period === "string"
      ) {
        acc.push(<Fragment key={index}>/{shortenPeriod(period)}</Fragment>);

        index += 1;
      }
    }

    if (metricResetAt) {
      acc.push(
        <Fragment key={index}>
          {acc.length > 0 && <> • </>}
          {t("Resets", {
            date: toPrettyDate(metricResetAt, {
              month: "numeric",
              day: "numeric",
              year: undefined,
            }),
          })}
        </Fragment>,
      );

      index += 1;
    }

    if (acc.length > 0) {
      return acc;
    }

    if (typeof usage === "number") {
      return typeof allocation === "number"
        ? t("usage.limited", {
            amount: formatNumber(usage),
            allocation: formatNumber(allocation),
          })
        : t("usage.unlimited", {
            amount: formatNumber(usage),
          });
    }
  }, [
    t,
    period,
    feature,
    currency,
    price,
    priceBehavior,
    packageSize,
    allocation,
    usage,
    metricResetAt,
    cost,
  ]);

  // this should never be the case since there should always be an associated feature,
  // but we need to satisfy all possible cases
  if ((!text && !usageText) || !feature) {
    return null;
  }

  return (
    <Box
      $flexBasis="min-content"
      $flexGrow={1}
      $textAlign={shouldWrapChildren ? "left" : "right"}
    >
      {layout.entitlement.isVisible && (
        <Box $whiteSpace="nowrap">
          <Text display={layout.entitlement.fontStyle} $leading={1}>
            {text}
          </Text>
        </Box>
      )}

      {layout.usage.isVisible && usageText && (
        <Flex $justifyContent="end" $alignItems="baseline" $whiteSpace="nowrap">
          <Text display={layout.usage.fontStyle} $leading={1}>
            {usageText}
          </Text>

          {priceBehavior === PriceBehavior.Tiered && (
            <PricingTiersTooltip
              feature={feature}
              period={period}
              currency={currency}
              priceTiers={priceTiers}
            />
          )}
        </Flex>
      )}
    </Box>
  );
};
