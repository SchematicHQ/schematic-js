import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components";
import type {
  FeatureUsageResponseData,
  UsageBasedEntitlementResponseData,
} from "../../../api";
import { useEmbed } from "../../../hooks";
import { formatCurrency, formatNumber, shortenPeriod } from "../../../utils";
import { Box, Text } from "../../ui";
import { type DesignProps } from "./IncludedFeatures";
import { getFeatureName } from "../../../utils/helpers";

interface DetailsProps extends DesignProps {
  shouldWrapChildren: boolean;
  details: {
    featureUsage?: FeatureUsageResponseData;
    usageData?: UsageBasedEntitlementResponseData;
  };
}

export const Details = ({
  details,
  shouldWrapChildren,
  ...props
}: DetailsProps) => {
  const { featureUsage, usageData } = details;
  const {
    allocation,
    feature,
    priceBehavior,
    usage,
    softLimit,
    monthlyUsageBasedPrice,
    yearlyUsageBasedPrice,
  } = featureUsage || {};
  const { t } = useTranslation();

  const theme = useTheme();

  const { data } = useEmbed();

  const currency = useMemo(() => {
    if (data.company?.plan?.planPeriod === "month") {
      return monthlyUsageBasedPrice?.currency;
    }

    if (data.company?.plan?.planPeriod === "year") {
      return yearlyUsageBasedPrice?.currency;
    }
  }, [
    data.company?.plan?.planPeriod,
    monthlyUsageBasedPrice,
    yearlyUsageBasedPrice,
  ]);

  const price = useMemo(() => {
    if (data.company?.plan?.planPeriod === "month") {
      return monthlyUsageBasedPrice?.price;
    }

    if (data.company?.plan?.planPeriod === "year") {
      return yearlyUsageBasedPrice?.price;
    }
  }, [
    data.company?.plan?.planPeriod,
    monthlyUsageBasedPrice,
    yearlyUsageBasedPrice,
  ]);

  const text = useMemo(() => {
    if (!feature?.name) {
      return;
    }

    if (priceBehavior === "pay_in_advance" && typeof allocation === "number") {
      return `${formatNumber(allocation)} ${getFeatureName(feature, allocation)}`;
    }

    if (priceBehavior === "pay_as_you_go" && typeof price === "number") {
      return `${formatCurrency(price, currency)} ${t("per")} ${getFeatureName(feature, 1)}`;
    }

    if (priceBehavior === "overage" && typeof softLimit === "number") {
      return `${formatNumber(softLimit)} ${getFeatureName(feature, softLimit)}`;
    }

    if (!priceBehavior && typeof allocation === "number") {
      return `${formatNumber(allocation)} ${getFeatureName(feature, allocation)}`;
    }

    if (!priceBehavior) {
      return t("Unlimited", { item: getFeatureName(feature) });
    }
  }, [t, allocation, feature?.name, price, priceBehavior, currency, softLimit]);

  const usageText = useMemo(() => {
    if (!feature?.name) {
      return;
    }

    if (usageData) {
      let acc: string | undefined;

      if (
        priceBehavior === "pay_in_advance" &&
        typeof data.company?.plan?.planPeriod === "string" &&
        typeof price === "number"
      ) {
        acc = `${formatCurrency(price, currency)}/${getFeatureName(feature, 1)}/${shortenPeriod(data.company.plan.planPeriod)}`;
      } else if (
        (priceBehavior === "pay_as_you_go" || priceBehavior === "overage") &&
        typeof usage === "number"
      ) {
        acc = `${usage} ${getFeatureName(feature, usage)} ${t("used")}`;
      }

      if (acc) {
        if (
          priceBehavior === "pay_in_advance" &&
          typeof price === "number" &&
          typeof allocation === "number"
        ) {
          acc += ` • ${formatCurrency(price * allocation, currency)}`;
        } else if (
          priceBehavior === "pay_as_you_go" &&
          typeof price === "number" &&
          typeof usage === "number"
        ) {
          acc += ` • ${formatCurrency(price * usage, currency)}`;
        } else if (
          priceBehavior === "overage" &&
          typeof price === "number" &&
          typeof usage === "number" &&
          typeof softLimit === "number"
        ) {
          const cost = price * (usage - softLimit);
          const period =
            feature.featureType === "event" &&
            typeof data.company?.plan?.planPeriod === "string"
              ? `/${shortenPeriod(data.company.plan.planPeriod)}`
              : "";

          acc +=
            cost > 0
              ? ` • ${t("Overage")}: ${formatCurrency(cost)}${period}`
              : ` • ${`${formatCurrency(price)}/${getFeatureName(feature, 1)}`} ${t("overage fee")}`;
        }

        return acc;
      }
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
    data.company?.plan?.planPeriod,
    feature?.name,
    feature?.featureType,
    priceBehavior,
    allocation,
    price,
    currency,
    softLimit,
    usage,
    usageData,
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
