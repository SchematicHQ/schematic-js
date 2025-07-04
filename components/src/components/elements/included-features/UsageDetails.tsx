import { Fragment, useMemo } from "react";
import { useTranslation } from "react-i18next";

import { type FeatureUsageResponseData } from "../../../api/checkoutexternal";
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
  entitlement: {
    isVisible: boolean;
    fontStyle: FontStyle;
  };
  usage: {
    isVisible: boolean;
    fontStyle: FontStyle;
  };
  shouldWrapChildren: boolean;
  featureUsage: FeatureUsageResponseData;
}

export const UsageDetails = ({
  shouldWrapChildren,
  featureUsage,
  ...props
}: UsageDetailsProps) => {
  const {
    allocation,
    allocationType,
    feature,
    priceBehavior,
    usage,
    softLimit,
  } = featureUsage;

  const { t } = useTranslation();

  const { data } = useEmbed();

  const { planPeriod } = useMemo(() => {
    const planPeriod =
      isCheckoutData(data) && typeof data.company?.plan?.planPeriod === "string"
        ? data.company.plan.planPeriod
        : undefined;

    return { planPeriod };
  }, [data]);

  const { billingPrice, currentTier, cost } = getUsageDetails(
    featureUsage,
    planPeriod,
  );

  const text = useMemo(() => {
    if (!feature) {
      return;
    }

    const { price, currency, packageSize = 1 } = billingPrice || {};

    if (priceBehavior === "pay_in_advance" && typeof allocation === "number") {
      return (
        <>
          {formatNumber(allocation)} {getFeatureName(feature, allocation)}
        </>
      );
    }

    if (priceBehavior === "pay_as_you_go" && typeof price === "number") {
      return (
        <>
          {formatCurrency(price, currency)} {t("per")}{" "}
          {packageSize > 1 && <>{packageSize} </>}
          {getFeatureName(feature, packageSize)}
        </>
      );
    }

    if (priceBehavior === "overage" && typeof softLimit === "number") {
      return (
        <>
          {formatNumber(softLimit)} {getFeatureName(feature, softLimit)}
        </>
      );
    }

    if (priceBehavior === "tier") {
      return (
        <>
          {currentTier?.to && <>{formatNumber(currentTier.to)} </>}
          {getFeatureName(feature, currentTier?.to)}
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
      priceBehavior === "pay_in_advance" &&
      typeof planPeriod === "string" &&
      typeof price === "number"
    ) {
      acc.push(
        <Fragment key={index}>
          {formatCurrency(price, currency)}/
          {packageSize > 1 && <>{packageSize} </>}
          {getFeatureName(feature, packageSize)}/{shortenPeriod(planPeriod)}
        </Fragment>,
      );
      index += 1;
    } else if (
      (priceBehavior === "pay_as_you_go" ||
        priceBehavior === "overage" ||
        priceBehavior === "tier") &&
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

        if (feature.featureType === "trait" && typeof planPeriod === "string") {
          acc.push(
            <Fragment key={index}>/{shortenPeriod(planPeriod)}</Fragment>,
          );
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
    planPeriod,
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
      {props.entitlement.isVisible && (
        <Box $whiteSpace="nowrap">
          <Text display={props.entitlement.fontStyle} $leading={1}>
            {text}
          </Text>
        </Box>
      )}

      {props.usage.isVisible && usageText && (
        <Flex $justifyContent="end" $alignItems="center" $whiteSpace="nowrap">
          {priceBehavior === "tier" && (
            <PricingTiersTooltip
              featureName={feature.name}
              priceTiers={billingPrice?.priceTier}
              currency={billingPrice?.currency}
            />
          )}

          <Text display={props.usage.fontStyle} $leading={1}>
            {usageText}
          </Text>
        </Flex>
      )}
    </Box>
  );
};
