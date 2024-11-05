import { useTheme } from "styled-components";
import pluralize from "pluralize";
import type { PlanEntitlementResponseData } from "../../../api";
import { useIsLightBackground } from "../../../hooks";
import { formatNumber } from "../../../utils";
import { Flex, IconRound, Text, type IconNameTypes } from "../../ui";

type PlanEntitlementRowProps = Pick<
  PlanEntitlementResponseData,
  "feature" | "metricPeriod" | "valueNumeric" | "valueType"
>;

export const PlanEntitlementRow = ({
  feature,
  metricPeriod,
  valueNumeric,
  valueType,
}: PlanEntitlementRowProps) => {
  const theme = useTheme();

  const isLightBackground = useIsLightBackground();

  const hasNumericValue =
    valueType === "numeric" ||
    valueType === "unlimited" ||
    valueType === "trait";

  if (hasNumericValue) {
    let period;
    if (metricPeriod) {
      period = {
        billing: "billing period",
        current_day: "day",
        current_month: "month",
        current_year: "year",
      }[metricPeriod];
    }

    return (
      <Flex
        $flexWrap="wrap"
        $justifyContent="space-between"
        $alignItems="center"
        $gap="1rem"
      >
        <Flex $gap="1rem">
          {feature?.icon && (
            <IconRound
              name={feature.icon as IconNameTypes}
              size="sm"
              colors={[
                theme.primary,
                isLightBackground
                  ? "hsla(0, 0%, 0%, 0.0625)"
                  : "hsla(0, 0%, 100%, 0.25)",
              ]}
            />
          )}

          {feature?.name && (
            <Flex $alignItems="center">
              <Text
                $font={theme.typography.text.fontFamily}
                $size={theme.typography.text.fontSize}
                $weight={theme.typography.text.fontWeight}
                $color={theme.typography.text.color}
              >
                {hasNumericValue ? (
                  <>
                    {typeof valueNumeric === "number"
                      ? `${formatNumber(valueNumeric)} ${pluralize(feature.name, valueNumeric)}`
                      : `Unlimited ${pluralize(feature.name)}`}
                    {period && ` per ${period}`}
                  </>
                ) : (
                  feature.name
                )}
              </Text>
            </Flex>
          )}
        </Flex>
      </Flex>
    );
  }
};
