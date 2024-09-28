import { useTheme } from "styled-components";
import pluralize from "pluralize";
import type { PlanEntitlementResponseData } from "../../../api";
import { formatNumber } from "../../../utils";
import { Flex, Text } from "../../ui";

export const FeatureName = ({
  entitlement,
}: {
  entitlement: PlanEntitlementResponseData;
}) => {
  const theme = useTheme();

  if (!entitlement.feature?.name) {
    return null;
  }

  if (
    entitlement.valueType === "numeric" ||
    entitlement.valueType === "unlimited" ||
    entitlement.valueType === "trait"
  ) {
    let period;
    if (entitlement.metricPeriod) {
      period = {
        current_day: "day",
        current_month: "month",
        current_year: "year",
      }[entitlement.metricPeriod];
    }

    return (
      <Flex $alignItems="center">
        <Text
          $font={theme.typography.text.fontFamily}
          $size={theme.typography.text.fontSize}
          $weight={theme.typography.text.fontWeight}
          $color={theme.typography.text.color}
        >
          {typeof entitlement.valueNumeric === "number"
            ? `${formatNumber(entitlement.valueNumeric)} ${pluralize(entitlement.feature.name, entitlement.valueNumeric)}`
            : `Unlimited ${pluralize(entitlement.feature.name)}`}
          {period && ` per ${period}`}
        </Text>
      </Flex>
    );
  }

  return (
    <Flex $alignItems="center">
      <Text
        $font={theme.typography.text.fontFamily}
        $size={theme.typography.text.fontSize}
        $weight={theme.typography.text.fontWeight}
        $color={theme.typography.text.color}
      >
        {entitlement.feature.name}
      </Text>
    </Flex>
  );
};
