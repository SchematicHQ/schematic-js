import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components";
import type {
  CompanyPlanDetailResponseData,
  CompanyPlanWithBillingSubView,
} from "../../../api";
import { TEXT_BASE_SIZE } from "../../../const";
import { useIsLightBackground } from "../../../hooks";
import { hexToHSL, formatCurrency } from "../../../utils";
import { cardBoxShadow } from "../../layout";
import { Box, EmbedButton, Flex, Icon, Text, Tooltip } from "../../ui";
import { PlanEntitlementRow } from "./PlanEntitlementRow";
import { useState } from "react";

interface PlanProps {
  isLoading: boolean;
  plans: CompanyPlanDetailResponseData[];
  currentPlan?: CompanyPlanWithBillingSubView;
  selectedPlan?: CompanyPlanDetailResponseData;
  period: string;
  selectPlan: (plan: CompanyPlanDetailResponseData, newPeriod?: string) => void;
}

export const Plan = ({
  isLoading,
  plans,
  currentPlan,
  selectedPlan,
  period,
  selectPlan,
}: PlanProps) => {
  const visibleCount = 4;
  const [showAll, setShowAll] = useState(visibleCount);
  const [isExpanded, setIsExpanded] = useState(false);

  const { t } = useTranslation();

  const theme = useTheme();

  const isLightBackground = useIsLightBackground();

  const cardPadding = theme.card.padding / TEXT_BASE_SIZE;

  const currentPlanIndex = plans.findIndex((plan) => plan.current);

  const handleToggleShowAll = () => {
    if (isExpanded) {
      setShowAll(visibleCount);
      setIsExpanded(false);
    } else {
      setShowAll(plans.length);
      setIsExpanded(true);
    }
  };

  return (
    <>
      <Box
        $display="grid"
        $gridTemplateColumns="repeat(auto-fill, minmax(300px, 1fr))"
        $gap="1rem"
        $flexGrow="1"
      >
        {plans.map((plan, index) => {
          const isActivePlan =
            plan.current && currentPlan?.planPeriod === period;

          return (
            <Flex
              key={plan.id}
              $position="relative"
              $flexDirection="column"
              $padding={`${0.75 * cardPadding}rem 0`}
              $backgroundColor={theme.card.background}
              $borderRadius={`${theme.card.borderRadius / TEXT_BASE_SIZE}rem`}
              $outlineWidth="2px"
              $outlineStyle="solid"
              $outlineColor={
                plan.id === selectedPlan?.id ? theme.primary : "transparent"
              }
              {...(theme.card.hasShadow && { $boxShadow: cardBoxShadow })}
            >
              <Flex
                $flexDirection="column"
                $gap="0.5rem"
                $padding={`0 ${cardPadding}rem ${0.75 * cardPadding}rem`}
                $borderBottomWidth="1px"
                $borderStyle="solid"
                $borderColor={
                  isLightBackground
                    ? "hsla(0, 0%, 0%, 0.175)"
                    : "hsla(0, 0%, 100%, 0.175)"
                }
                $viewport={{
                  md: {
                    $gap: "1rem",
                  },
                }}
              >
                <Box>
                  <Text
                    $font={theme.typography.heading2.fontFamily}
                    $size={theme.typography.heading2.fontSize}
                    $weight={theme.typography.heading2.fontWeight}
                    $color={theme.typography.heading2.color}
                  >
                    {plan.name}
                  </Text>
                </Box>

                <Box $marginBottom="0.5rem" $lineHeight={1.35}>
                  <Text
                    $font={theme.typography.text.fontFamily}
                    $size={theme.typography.text.fontSize}
                    $weight={theme.typography.text.fontWeight}
                    $color={theme.typography.text.color}
                  >
                    {plan.description}
                  </Text>
                </Box>

                <Box>
                  <Text
                    $font={theme.typography.heading2.fontFamily}
                    $size={theme.typography.heading2.fontSize}
                    $weight={theme.typography.heading2.fontWeight}
                    $color={theme.typography.heading2.color}
                  >
                    {formatCurrency(
                      (period === "month"
                        ? plan.monthlyPrice
                        : plan.yearlyPrice
                      )?.price ?? 0,
                    )}
                  </Text>

                  <Text
                    $font={theme.typography.heading2.fontFamily}
                    $size={(16 / 30) * theme.typography.heading2.fontSize}
                    $weight={theme.typography.heading2.fontWeight}
                    $color={theme.typography.heading2.color}
                  >
                    /{period}
                  </Text>
                </Box>

                {isActivePlan && (
                  <Flex
                    $position="absolute"
                    $right="1rem"
                    $top="1rem"
                    $fontSize="0.75rem"
                    $color={
                      hexToHSL(theme.primary).l > 50 ? "#000000" : "#FFFFFF"
                    }
                    $backgroundColor={theme.primary}
                    $borderRadius="9999px"
                    $padding="0.125rem 0.85rem"
                  >
                    {t("Active")}
                  </Flex>
                )}
              </Flex>

              <Flex
                $flexDirection="column"
                $justifyContent="end"
                $flexGrow="1"
                $gap={`${cardPadding}rem`}
                $padding={`${0.75 * cardPadding}rem ${cardPadding}rem 0`}
              >
                <Flex $flexDirection="column" $gap="1rem" $flexGrow="1">
                  {plan.entitlements
                    .slice(0, showAll)
                    .map(
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

                  {plan.entitlements.length > 4 && (
                    <Flex
                      $alignItems="center"
                      $justifyContent="start"
                      $marginTop="1rem"
                    >
                      <Icon
                        name={isExpanded ? "chevron-up" : "chevron-down"}
                        style={{
                          fontSize: "1.4rem",
                          lineHeight: "1em",
                          marginRight: ".25rem",
                          color: "#D0D0D0",
                        }}
                      />
                      <Text
                        onClick={handleToggleShowAll}
                        $font={theme.typography.link.fontFamily}
                        $size={theme.typography.link.fontSize}
                        $weight={theme.typography.link.fontWeight}
                        $leading={1}
                        $color={theme.typography.link.color}
                        style={{ cursor: "pointer" }}
                      >
                        {isExpanded ? t("Hide all") : t("See all")}
                      </Text>
                    </Flex>
                  )}
                </Flex>

                {plan.id === selectedPlan?.id ? (
                  <Flex
                    $justifyContent="center"
                    $alignItems="center"
                    $gap="0.25rem"
                    $padding="0.625rem 0"
                  >
                    <Icon
                      name="check-rounded"
                      style={{
                        fontSize: 20,
                        lineHeight: 1,
                        color: theme.primary,
                      }}
                    />

                    <Text
                      $size={15}
                      $leading={1}
                      $color={theme.typography.text.color}
                    >
                      {isActivePlan ? t("Current plan") : t("Selected")}
                    </Text>
                  </Flex>
                ) : (
                  <EmbedButton
                    disabled={isLoading || !plan.valid}
                    onClick={() => {
                      selectPlan(plan);
                    }}
                    $size="sm"
                    $color="primary"
                    $variant={index < currentPlanIndex ? "outline" : "filled"}
                  >
                    {!plan.valid ? (
                      <Tooltip
                        trigger={t("Over usage limit")}
                        content={t(
                          "Current usage exceeds the limit of this plan.",
                        )}
                      />
                    ) : (
                      t("Choose plan")
                    )}
                  </EmbedButton>
                )}
              </Flex>
            </Flex>
          );
        })}
      </Box>
    </>
  );
};
