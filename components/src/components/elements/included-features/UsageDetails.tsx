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
    creditRemaining,
    creditConsumptionRate,
  } = entitlement;

  const { t } = useTranslation();

  const { data } = useEmbed();

  const { period, showCredits } = useMemo(() => {
    return {
      period: data?.company?.plan?.planPeriod || undefined,
      showCredits: data?.displaySettings?.showCredits ?? true,
    };
  }, [data?.company?.plan?.planPeriod, data?.displaySettings?.showCredits]);

  const { billingPrice, cost, currentTier } = useMemo(
    () => getUsageDetails(entitlement, period),
    [entitlement, period],
  );

  const text = useMemo(() => {
    if (!feature) {
      return;
    }

    const { price, currency, packageSize = 1 } = billingPrice || {};

    if (
      priceBehavior === PriceBehavior.PayInAdvance &&
      typeof allocation === "number"
    ) {
      return (
        <>
          {formatNumber(allocation)} {getFeatureName(feature, allocation)}
        </>
      );
    }

    if (
      priceBehavior === PriceBehavior.PayAsYouGo &&
      typeof price === "number"
    ) {
      return (
        <>
          {formatCurrency(price, currency)} {t("per")}{" "}
          {packageSize > 1 && <>{packageSize} </>}
          {getFeatureName(feature, packageSize)}
        </>
      );
    }

    if (
      priceBehavior === PriceBehavior.Overage &&
      typeof softLimit === "number"
    ) {
      return (
        <>
          {formatNumber(softLimit)} {getFeatureName(feature, softLimit)}
        </>
      );
    }

    if (priceBehavior === PriceBehavior.Tiered) {
      return (
        <>
          {typeof currentTier?.to === "number" &&
            (currentTier?.to === Infinity
              ? t("Unlimited in this tier", {
                  feature: getFeatureName(feature),
                })
              : t("Up to X units in this tier", {
                  amount: formatNumber(currentTier.to),
                  feature: getFeatureName(feature, currentTier?.to),
                }))}
        </>
      );
    }

    if (
      showCredits &&
      priceBehavior === PriceBehavior.Credit &&
      planEntitlement?.valueCredit &&
      typeof creditRemaining === "number"
    ) {
      return (
        <>
          {formatNumber(creditRemaining)}{" "}
          {getFeatureName(planEntitlement.valueCredit, creditRemaining)}{" "}
          {t("remaining")}
        </>
      );
    }

    if (!priceBehavior && typeof allocation === "number") {
      return (
        <>
          {formatNumber(allocation)} {getFeatureName(feature, allocation)}
        </>
      );
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
    priceBehavior,
    softLimit,
    billingPrice,
    currentTier,
    showCredits,
    creditRemaining,
  ]);

  const usageText = useMemo(() => {
    if (!feature) {
      return;
    }

    const { price, currency, packageSize = 1 } = billingPrice || {};

    const acc: React.ReactNode[] = [];

    let index = 0;

    if (
      priceBehavior === PriceBehavior.PayInAdvance &&
      typeof period === "string" &&
      typeof price === "number"
    ) {
      acc.push(
        <Fragment key={index}>
          {formatCurrency(price, currency)}/
          {packageSize > 1 && <>{packageSize} </>}
          {getFeatureName(feature, packageSize)}/{shortenPeriod(period)}
        </Fragment>,
      );

      index += 1;
    } else if (
      (priceBehavior === PriceBehavior.PayAsYouGo ||
        priceBehavior === PriceBehavior.Overage ||
        priceBehavior === PriceBehavior.Tiered) &&
      typeof usage === "number"
    ) {
      acc.push(
        <Fragment key={index}>
          {usage} {getFeatureName(feature, usage)} {t("used")}
        </Fragment>,
      );

      index += 1;
    } else if (
      showCredits &&
      priceBehavior === PriceBehavior.Credit &&
      typeof creditRemaining === "number" &&
      typeof creditConsumptionRate === "number" &&
      creditConsumptionRate > 0
    ) {
      const unitsRemaining = Math.floor(
        creditRemaining / creditConsumptionRate,
      );
      acc.push(
        <Fragment key={index}>
          {formatNumber(unitsRemaining)}{" "}
          {getFeatureName(feature, unitsRemaining)} {t("remaining")}
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
    priceBehavior,
    allocation,
    usage,
    metricResetAt,
    billingPrice,
    cost,
    showCredits,
    creditRemaining,
    creditConsumptionRate,
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
        <Flex $justifyContent="end" $alignItems="end" $whiteSpace="nowrap">
          <Text display={layout.usage.fontStyle} $leading={1}>
            {usageText}
          </Text>

          {priceBehavior === PriceBehavior.Tiered && (
            <PricingTiersTooltip
              feature={feature}
              period={period}
              currency={billingPrice?.currency}
              priceTiers={billingPrice?.priceTier}
            />
          )}
        </Flex>
      )}
    </Box>
  );
};
