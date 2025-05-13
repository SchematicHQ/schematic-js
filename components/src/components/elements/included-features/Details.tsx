import { Fragment, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components";

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
    feature,
    priceBehavior,
    usage,
    softLimit,
    monthlyUsageBasedPrice,
    yearlyUsageBasedPrice,
  } = featureUsage;

  const { t } = useTranslation();

  const theme = useTheme();

  const { data } = useEmbed();

  const planPeriod = useMemo(() => {
    return isCheckoutData(data) &&
      typeof data.company?.plan?.planPeriod === "string"
      ? data.company.plan.planPeriod
      : undefined;
  }, [data]);

  const {
    price,
    priceDecimal,
    priceTier,
    currency,
    packageSize = 1,
  } = useMemo(() => {
    const {
      price: entitlementPrice,
      priceDecimal: entitlementPriceDecimal,
      priceTier: entitlementPriceTier,
      currency: entitlementCurrency,
      packageSize: entitlementPackageSize,
    } = getBillingPrice(
      planPeriod === "year" ? yearlyUsageBasedPrice : monthlyUsageBasedPrice,
    ) || {};

    return {
      price: entitlementPrice,
      priceDecimal: entitlementPriceDecimal,
      priceTier: entitlementPriceTier,
      currency: entitlementCurrency,
      packageSize: entitlementPackageSize,
    };
  }, [planPeriod, monthlyUsageBasedPrice, yearlyUsageBasedPrice]);

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

    if (!priceBehavior) {
      return t("Unlimited", { item: getFeatureName(feature) });
    }
  }, [
    t,
    allocation,
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
              • {formatCurrency(cost)}${period}
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
          <Text
            $font={theme.typography[props.entitlement.fontStyle].fontFamily}
            $size={theme.typography[props.entitlement.fontStyle].fontSize}
            $weight={theme.typography[props.entitlement.fontStyle].fontWeight}
            $color={theme.typography[props.entitlement.fontStyle].color}
            $leading={1}
          >
            {text}
          </Text>
        </Box>
      )}

      {props.usage.isVisible && usageText && (
        <Box $whiteSpace="nowrap">
          <Text
            $font={theme.typography[props.usage.fontStyle].fontFamily}
            $size={theme.typography[props.usage.fontStyle].fontSize}
            $weight={theme.typography[props.usage.fontStyle].fontWeight}
            $color={theme.typography[props.usage.fontStyle].color}
            $leading={1}
          >
            {usageText}
          </Text>
        </Box>
      )}
    </Box>
  );
};
