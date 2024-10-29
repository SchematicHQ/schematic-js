import { useMemo, useState } from "react";
import { useTheme } from "styled-components";
import pluralize from "pluralize";
import type {
  CompanyPlanWithBillingSubView,
  CompanyPlanDetailResponseData,
} from "../../../api";
import { TEXT_BASE_SIZE } from "../../../const";
import { useEmbed, useIsLightBackground } from "../../../hooks";
import { formatCurrency, hexToHSL } from "../../../utils";
import {
  Box,
  Flex,
  EmbedButton,
  Icon,
  IconRound,
  Text,
  Tooltip,
  type IconNameTypes,
} from "../../ui";

const getActivePlans = (
  plans: CompanyPlanDetailResponseData[],
  period: CompanyPlanWithBillingSubView["planPeriod"],
  mode: string,
) => {
  return mode === "edit"
    ? plans
    : plans.filter(
        (plan) =>
          (period === "month" && plan.monthlyPrice) ||
          (period === "year" && plan.yearlyPrice),
      );
};

export const PricingTable = () => {
  const theme = useTheme();

  const { data, mode } = useEmbed();

  const [period, setPeriod] = useState(() => data.company?.plan?.planPeriod);

  const { plans, addOns, periods } = useMemo(() => {
    const periods = [];
    if (data.activePlans.some((plan) => plan.monthlyPrice)) {
      periods.push("month");
    }
    if (data.activePlans.some((plan) => plan.yearlyPrice)) {
      periods.push("year");
    }

    return {
      plans: getActivePlans(data.activePlans, period, mode),
      addOns: getActivePlans(data.activeAddOns, period, mode),
      periods,
    };
  }, [data.activePlans, data.activeAddOns, period, mode]);

  const isLightBackground = useIsLightBackground();

  return (
    <Flex $flexWrap="wrap" $gap="1rem" $flexGrow="1">
      {plans
        .sort((a, b) => {
          if (period === "year") {
            return (a.yearlyPrice?.price ?? 0) - (b.yearlyPrice?.price ?? 0);
          }

          if (period === "month") {
            return (a.monthlyPrice?.price ?? 0) - (b.monthlyPrice?.price ?? 0);
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
              $outlineColor={plan.current ? theme.primary : "transparent"}
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
                $height="auto"
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
                $height="auto"
                $padding="1.5rem"
              >
                {plan.entitlements.map((entitlement) => {
                  return (
                    <Flex
                      key={entitlement.id}
                      $flexWrap="wrap"
                      $justifyContent="space-between"
                      $alignItems="center"
                      $gap="1rem"
                    >
                      <Flex $gap="1rem">
                        {entitlement.feature?.icon && (
                          <IconRound
                            name={entitlement.feature.icon as IconNameTypes}
                            size="sm"
                            colors={[
                              theme.primary,
                              isLightBackground
                                ? "hsla(0, 0%, 0%, 0.0625)"
                                : "hsla(0, 0%, 100%, 0.25)",
                            ]}
                          />
                        )}

                        <FeatureName entitlement={entitlement} />
                      </Flex>
                    </Flex>
                  );
                })}
              </Flex>

              <Flex
                $flexDirection="column"
                $position="relative"
                $gap="1rem"
                $width="100%"
                $height="auto"
                $padding="1.5rem"
              >
                {!plan.current ? (
                  <Box $position="relative">
                    <EmbedButton
                      disabled={!plan.valid}
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
  );
};
