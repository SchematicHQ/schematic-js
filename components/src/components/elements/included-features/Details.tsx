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
    feature,
    priceBehavior,
    usage,
    softLimit,
    monthlyUsageBasedPrice,
    yearlyUsageBasedPrice,
  } = featureUsage;

  const { t } = useTranslation();

  const { data } = useEmbed();

  const { planPeriod, billingPrice } = useMemo(() => {
    const planPeriod =
      isCheckoutData(data) && typeof data.company?.plan?.planPeriod === "string"
        ? data.company.plan.planPeriod
        : undefined;
    const billingPrice = getBillingPrice(
      planPeriod === "year" ? yearlyUsageBasedPrice : monthlyUsageBasedPrice,
    );

    return { planPeriod, billingPrice };
  }, [data, monthlyUsageBasedPrice, yearlyUsageBasedPrice]);

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
  }, [t, allocation, feature, priceBehavior, softLimit, billingPrice]);

  const usageText = useMemo(() => {
    if (!feature) {
      return;
    }

    const { price, currency, packageSize = 1 } = billingPrice || {};

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
      } else if (priceBehavior === "overage") {
        const overageAmount = Math.max(0, (usage ?? 0) - (softLimit ?? 0));

        let price = billingPrice?.price;
        if (billingPrice?.priceTier.length) {
          const overagePriceTier =
            billingPrice.priceTier[billingPrice.priceTier.length - 1];
          if (typeof overagePriceTier.perUnitPriceDecimal === "string") {
            price = Number(overagePriceTier.perUnitPriceDecimal);
          } else if (typeof overagePriceTier.perUnitPrice === "number") {
            price = overagePriceTier.perUnitPrice;
          }
        }

        const period =
          feature.featureType === "trait" && typeof planPeriod === "string"
            ? `/${shortenPeriod(planPeriod)}`
            : "";

        if (price && overageAmount > 0) {
          acc.push(
            <Fragment key={index}>
              {" "}
              • {formatCurrency(price * overageAmount, currency)}
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
    usage,
    softLimit,
    billingPrice,
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
