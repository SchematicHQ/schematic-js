import { useTheme } from "styled-components";
import type { CompanyPlanDetailResponseData } from "../../../api";
import { TEXT_BASE_SIZE } from "../../../const";
import { useIsLightBackground } from "../../../hooks";
import { hexToHSL, formatCurrency } from "../../../utils";
import { Box, EmbedButton, Flex, Icon, Text, Tooltip } from "../../ui";
import { PlanEntitlementRow } from "./PlanEntitlementRow";

interface PlanProps {
  isLoading: boolean;
  plans: CompanyPlanDetailResponseData[];
  selectedPlan?: CompanyPlanDetailResponseData;
  period: string;
  selectPlan: (plan: CompanyPlanDetailResponseData, newPeriod?: string) => void;
}

export const Plan = ({
  isLoading,
  plans,
  selectedPlan,
  period,
  selectPlan,
}: PlanProps) => {
  const theme = useTheme();

  const isLightBackground = useIsLightBackground();

  return (
    <>
      <Flex $flexDirection="column" $gap="1rem" $marginBottom="1rem">
        <Text
          as="h3"
          id="select-plan-dialog-label"
          $font={theme.typography.heading3.fontFamily}
          $size={theme.typography.heading3.fontSize}
          $weight={theme.typography.heading3.fontWeight}
          $color={theme.typography.heading3.color}
          $marginBottom="0.5rem"
        >
          Select plan
        </Text>

        <Text
          as="p"
          id="select-plan-dialog-description"
          $font={theme.typography.text.fontFamily}
          $size={theme.typography.text.fontSize}
          $weight={theme.typography.text.fontWeight}
          $color={theme.typography.text.color}
        >
          Choose your base plan
        </Text>
      </Flex>

      <Flex $flexWrap="wrap" $gap="1rem" $flexGrow="1">
        {plans
          .sort((a, b) => {
            if (period === "year") {
              return (a.yearlyPrice?.price ?? 0) - (b.yearlyPrice?.price ?? 0);
            }

            if (period === "month") {
              return (
                (a.monthlyPrice?.price ?? 0) - (b.monthlyPrice?.price ?? 0)
              );
            }

            return 0;
          })
          .map((plan) => {
            return (
              <Flex
                key={plan.id}
                $flexDirection="column"
                $width="100%"
                $minWidth="280px"
                $maxWidth={`calc(${100 / 3}% - 1rem)`}
                $backgroundColor={theme.card.background}
                $outlineWidth="2px"
                $outlineStyle="solid"
                $outlineColor={
                  plan.id === selectedPlan?.id ? theme.primary : "transparent"
                }
                $borderRadius={`${theme.card.borderRadius / TEXT_BASE_SIZE}rem`}
                {...(theme.card.hasShadow && {
                  $boxShadow:
                    "0px 1px 3px rgba(16, 24, 40, 0.1), 0px 1px 20px rgba(16, 24, 40, 0.06)",
                })}
              >
                <Flex
                  $flexDirection="column"
                  $position="relative"
                  $gap="1rem"
                  $width="100%"
                  $padding={`${theme.card.padding / TEXT_BASE_SIZE}rem`}
                  $borderBottomWidth="1px"
                  $borderStyle="solid"
                  $borderColor={
                    isLightBackground
                      ? "hsla(0, 0%, 0%, 0.175)"
                      : "hsla(0, 0%, 100%, 0.175)"
                  }
                >
                  <Text $size={20} $weight={600}>
                    {plan.name}
                  </Text>

                  <Text $size={14}>{plan.description}</Text>

                  <Text>
                    <Box $display="inline-block" $fontSize="1.5rem">
                      {formatCurrency(
                        (period === "month"
                          ? plan.monthlyPrice
                          : plan.yearlyPrice
                        )?.price ?? 0,
                      )}
                    </Box>

                    <Box $display="inline-block" $fontSize="0.75rem">
                      /{period}
                    </Box>
                  </Text>

                  {plan.current && (
                    <Flex
                      $position="absolute"
                      $right="1rem"
                      $top="1rem"
                      $fontSize="0.625rem"
                      $color={
                        hexToHSL(theme.primary).l > 50 ? "#000000" : "#FFFFFF"
                      }
                      $backgroundColor={theme.primary}
                      $borderRadius="9999px"
                      $padding="0.125rem 0.85rem"
                    >
                      Current plan
                    </Flex>
                  )}
                </Flex>

                <Flex
                  $flexDirection="column"
                  $position="relative"
                  $gap="0.5rem"
                  $flex="1"
                  $width="100%"
                  $padding="1.5rem"
                >
                  {plan.entitlements.map(
                    ({
                      id,
                      feature,
                      metricPeriod,
                      valueNumeric,
                      valueType,
                    }) => (
                      <PlanEntitlementRow
                        key={id}
                        feature={feature}
                        metricPeriod={metricPeriod}
                        valueNumeric={valueNumeric}
                        valueType={valueType}
                      />
                    ),
                  )}
                </Flex>

                <Flex
                  $flexDirection="column"
                  $position="relative"
                  $gap="1rem"
                  $width="100%"
                  $padding="1.5rem"
                >
                  {plan.id !== selectedPlan?.id ? (
                    <Box $position="relative">
                      <EmbedButton
                        disabled={isLoading || plan.valid === false}
                        {...(plan.valid === true && {
                          onClick: () => selectPlan(plan),
                        })}
                        $size="sm"
                        $color="primary"
                        $variant="outline"
                      >
                        {plan.valid === false ? (
                          <Tooltip
                            label="Over usage limit"
                            description=" Current usage exceeds limit of this plan"
                          />
                        ) : (
                          "Select"
                        )}
                      </EmbedButton>
                    </Box>
                  ) : (
                    <Flex
                      $justifyContent="center"
                      $alignItems="center"
                      $gap="0.25rem"
                      $fontSize="0.9375rem"
                      $padding="0.625rem 0"
                    >
                      <Icon
                        name="check-rounded"
                        style={{
                          fontSize: 20,
                          lineHeight: "1",
                          color: theme.primary,
                        }}
                      />

                      <Text
                        $lineHeight="1.4"
                        $color={theme.typography.text.color}
                      >
                        Selected
                      </Text>
                    </Flex>
                  )}
                </Flex>
              </Flex>
            );
          })}
      </Flex>
    </>
  );
};