import { Fragment, useMemo } from "react";
import { useTranslation } from "react-i18next";

import type { FeatureUsageResponseData } from "../../../api/checkoutexternal";
import { useEmbed } from "../../../hooks";
import {
  formatCurrency,
  formatNumber,
  getBillingPrice,
  getFeatureName,
  isCheckoutData,
  shortenPeriod,
} from "../../../utils";
import { Box, Text } from "../../ui";

import { type DesignProps } from "./IncludedFeatures";

interface DetailsProps extends DesignProps {
  shouldWrapChildren: boolean;
  featureUsage: FeatureUsageResponseData;
}

export const Details = ({
  shouldWrapChildren,
  featureUsage,
  ...props
}: DetailsProps) => {
  const {
    allocation,
    allocationType,
    feature,
    priceBehavior,
    usage,
    softLimit,
    monthlyUsageBasedPrice,
    yearlyUsageBasedPrice,
  } = featureUsage;

  const { t } = useTranslation();

  const { data } = useEmbed();

  const {
    planPeriod,
    price,
    priceDecimal,
    priceTier,
    currency,
    packageSize = 1,
  } = useMemo(() => {
    const planPeriod =
      isCheckoutData(data) && typeof data.company?.plan?.planPeriod === "string"
        ? data.company.plan.planPeriod
        : undefined;
    const billingPrice = getBillingPrice(
      planPeriod === "year" ? yearlyUsageBasedPrice : monthlyUsageBasedPrice,
    );

    return { planPeriod, ...billingPrice };
  }, [data, monthlyUsageBasedPrice, yearlyUsageBasedPrice]);

  const text = useMemo(() => {
    if (!feature) {
      return;
    }

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
    price,
    priceBehavior,
    currency,
    packageSize,
    softLimit,
  ]);

  const usageText = useMemo(() => {
    if (!feature) {
      return;
    }

    const acc: React.ReactElement[] = [];
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
      (priceBehavior === "pay_as_you_go" || priceBehavior === "overage") &&
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
      if (
        priceBehavior === "pay_in_advance" &&
        typeof price === "number" &&
        typeof allocation === "number"
      ) {
        acc.push(
          <Fragment key={index}>
            {" "}
            • {formatCurrency(price * allocation, currency)}
          </Fragment>,
        );
        index += 1;
      } else if (
        priceBehavior === "pay_as_you_go" &&
        typeof price === "number" &&
        typeof usage === "number"
      ) {
        acc.push(
          <Fragment key={index}>
            {" "}
            • {formatCurrency(price * usage, currency)}
          </Fragment>,
        );
        index += 1;
      } else if (
        priceBehavior === "overage" &&
        typeof price === "number" &&
        typeof usage === "number" &&
        typeof softLimit === "number"
      ) {
        let overagePrice = price ?? priceDecimal;

        // overage price tier
        if (priceTier?.length === 2) {
          const lastTier = priceTier[priceTier.length - 1];
          if (lastTier.perUnitPriceDecimal) {
            overagePrice = Number(lastTier.perUnitPriceDecimal);
          } else {
            overagePrice = lastTier.perUnitPrice ?? 0;
          }
        }

        const cost =
          usage - softLimit < 0 ? 0 : overagePrice * (usage - softLimit);
        const period =
          feature.featureType === "trait" && typeof planPeriod === "string"
            ? `/${shortenPeriod(planPeriod)}`
            : "";

        if (cost > 0) {
          acc.push(
            <Fragment key={index}>
              {" "}
              • {formatCurrency(cost)}
              {period}
            </Fragment>,
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
    price,
    priceDecimal,
    priceTier,
    currency,
    packageSize,
    softLimit,
    usage,
  ]);

  if (!text) {
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
        <Box $whiteSpace="nowrap">
          <Text display={props.usage.fontStyle} $leading={1}>
            {usageText}
          </Text>
        </Box>
      )}
    </Box>
  );
};
