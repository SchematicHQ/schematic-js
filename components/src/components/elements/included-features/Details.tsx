import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components";
import pluralize from "pluralize";
import type {
  FeatureUsageResponseData,
  PlanEntitlementResponseData,
  UsageBasedEntitlementResponseData,
} from "../../../api";
import { useEmbed } from "../../../hooks";
import { formatCurrency, formatNumber, shortenPeriod } from "../../../utils";
import { Box, Text } from "../../ui";
import { type DesignProps } from "./IncludedFeatures";
import { Usage } from "../../shared/checkout-dialog/Usage";

interface DetailsProps extends DesignProps {
  shouldWrapChildren: boolean;
  details: {
    entitlement?: PlanEntitlementResponseData;
    featureUsage?: FeatureUsageResponseData;
    usageData?: UsageBasedEntitlementResponseData;
  };
}

export const Details = ({
  details,
  shouldWrapChildren,
  ...props
}: DetailsProps) => {
  const { entitlement, featureUsage, usageData } = details;
  const { allocation, feature, usage } = details.featureUsage || {};

  const { t } = useTranslation();

  const theme = useTheme();

  const { data } = useEmbed();

  if (!feature?.name) {
    return null;
  }

  const quantity = entitlement?.valueNumeric;

  let price: number | undefined;
  if (data.company?.plan?.planPeriod === "month") {
    price = entitlement?.meteredMonthlyPrice?.price;
  } else if (data.company?.plan?.planPeriod === "year") {
    price = entitlement?.meteredYearlyPrice?.price;
  }

  let text: React.ReactNode;
  if (
    usageData?.priceBehavior === "pay_in_advance" &&
    typeof allocation === "number"
  ) {
    text = (
      <>
        {formatNumber(allocation)} {pluralize(feature.name, allocation)}
      </>
    );
  } else if (
    usageData?.priceBehavior === "pay_as_you_go" &&
    typeof price === "number"
  ) {
    text = (
      <>
        {formatCurrency(price)} {t("per")}{" "}
        {pluralize(feature.name.toLowerCase(), 1)}
      </>
    );
  } else if (typeof allocation === "number") {
    text = (
      <>
        {formatNumber(allocation)} {pluralize(feature.name, allocation)}
      </>
    );
  } else {
    text = t("Unlimited", { item: pluralize(feature.name) });
  }

  let usageText: React.ReactNode;
  if (usageData) {
    if (
      usageData?.priceBehavior === "pay_in_advance" &&
      typeof data.company?.plan?.planPeriod === "string" &&
      typeof price === "number"
    ) {
      usageText = `${formatCurrency(price)}/${shortenPeriod(data.company.plan.planPeriod)}/${pluralize(feature.name.toLowerCase(), 1)} • `;
    } else if (
      usageData?.priceBehavior === "pay_as_you_go" &&
      typeof usageData?.valueNumeric === "number"
    ) {
      usageText = `${usageData.valueNumeric} ${pluralize(feature.name.toLowerCase(), usageData.valueNumeric)} ${t("used")} • `;
    }

    if (
      usageData?.priceBehavior === "pay_in_advance" &&
      typeof price === "number" &&
      typeof allocation === "number"
    ) {
      usageText += formatCurrency(price * allocation);
    } else if (
      usageData?.priceBehavior === "pay_as_you_go" &&
      typeof price === "number" &&
      typeof usageData.valueNumeric === "number"
    ) {
      usageText += formatCurrency(price * usageData.valueNumeric);
    }
  } else if (typeof usage === "number") {
    usageText =
      typeof allocation === "number"
        ? t("usage.limited", {
            amount: formatNumber(usage),
            allocation: formatNumber(allocation),
          })
        : t("usage.unlimited", {
            amount: formatNumber(usage),
          });
  }

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
            $leading={1}
            $color={theme.typography[props.entitlement.fontStyle].color}
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
            $leading={1}
            $color={theme.typography[props.usage.fontStyle].color}
          >
            {usageText}
          </Text>
        </Box>
      )}
    </Box>
  );
};
