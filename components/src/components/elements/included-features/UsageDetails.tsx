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
  isCheckoutData,
  shortenPeriod,
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
  } = entitlement;

  const { t } = useTranslation();

  const { data } = useEmbed();

  const period = useMemo(() => {
    return isCheckoutData(data) &&
      typeof data.company?.plan?.planPeriod === "string"
      ? data.company.plan.planPeriod
      : undefined;
  }, [data]);

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
      priceBehavior === PriceBehavior.Credit &&
      planEntitlement?.valueCredit &&
      typeof planEntitlement?.consumptionRate === "number"
    ) {
      return (
        <>
          {planEntitlement.consumptionRate}{" "}
          {getFeatureName(
            planEntitlement.valueCredit,
            planEntitlement.consumptionRate,
          )}{" "}
          {t("per")} {t("use")}
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
    currentTier?.to,
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
        priceBehavior === PriceBehavior.Tiered ||
        priceBehavior === PriceBehavior.Credit) &&
      typeof usage === "number"
    ) {
      acc.push(
        <Fragment key={index}>
          {usage} {getFeatureName(feature, usage)} {t("used")}
        </Fragment>,
      );

      index += 1;
    }

    if (acc) {
      if (typeof cost === "number" && cost > 0) {
        acc.push(
          <Fragment key={index}> • {formatCurrency(cost, currency)}</Fragment>,
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
    billingPrice,
    cost,
  ]);

  // this should never be the case since there should always be an associated feature,
  // but we need to satisfy all possible cases
  if (!text || !feature?.name) {
    return null;
  }

  return (
    <Box
      $flexBasis="min-content"
      $flexGrow="1"
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
        <Flex $justifyContent="end" $alignItems="center" $whiteSpace="nowrap">
          {priceBehavior === PriceBehavior.Tiered && (
            <PricingTiersTooltip
              feature={feature}
              period={period}
              currency={billingPrice?.currency}
              priceTiers={billingPrice?.priceTier}
            />
          )}

          <Text display={layout.usage.fontStyle} $leading={1}>
            {usageText}
          </Text>
        </Flex>
      )}
    </Box>
  );
};
