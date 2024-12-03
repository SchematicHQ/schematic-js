import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components";
import type {
  CompanyPlanDetailResponseData,
  PlanEntitlementResponseData,
} from "../../../api";
import { TEXT_BASE_SIZE } from "../../../const";
import { formatCurrency } from "../../../utils";
import { cardBoxShadow } from "../../layout";
import { Box, Flex, Input, Text } from "../../ui";

interface UsageProps {
  isLoading: boolean;
  period: string;
  selectedPlan?: CompanyPlanDetailResponseData & { isSelected: boolean };
  entitlements: (PlanEntitlementResponseData & {
    quantity: number;
  })[];
  updateQuantity: (id: string, quantity: number) => void;
}

export const Usage = ({
  selectedPlan,
  entitlements,
  updateQuantity,
  isLoading,
  period,
}: UsageProps) => {
  const { t } = useTranslation();
  const theme = useTheme();

  const periodKey = period === "year" ? "yearlyPrice" : "monthlyPrice";

  const cardPadding = theme.card.padding / TEXT_BASE_SIZE;

  return (
    <>
      <Box
        $display="grid"
        $gridTemplateColumns="repeat(auto-fit, minmax(300px, 1fr))"
        $gap="1rem"
      >
        {entitlements.reduce((acc: JSX.Element[], entitlement) => {
          if (entitlement.feature) {
            acc.push(
              <Flex
                key={entitlement.id}
                $justifyContent="space-between"
                $alignItems="center"
                $gap="1rem"
                $padding={`${cardPadding}rem`}
                $backgroundColor={theme.card.background}
                $borderRadius={`${theme.card.borderRadius / TEXT_BASE_SIZE}rem`}
                {...(theme.card.hasShadow && { $boxShadow: cardBoxShadow })}
              >
                <Flex $flexDirection="column" $gap="0.75rem">
                  <Box>
                    <Text
                      $font={theme.typography.heading2.fontFamily}
                      $size={theme.typography.heading2.fontSize}
                      $weight={theme.typography.heading2.fontWeight}
                      $color={theme.typography.heading2.color}
                    >
                      {entitlement.feature.name}
                    </Text>
                  </Box>

                  {entitlement.feature.description && (
                    <Box $marginBottom="0.5rem">
                      <Text
                        $font={theme.typography.text.fontFamily}
                        $size={theme.typography.text.fontSize}
                        $weight={theme.typography.text.fontWeight}
                        $color={theme.typography.text.color}
                      >
                        {entitlement.feature.description}
                      </Text>
                    </Box>
                  )}
                </Flex>

                <Flex $flexDirection="column" $justifyContent="end">
                  <Input
                    type="number"
                    pattern="[0-9]*"
                    value={entitlement.quantity}
                    onChange={(event) => {
                      event.preventDefault();

                      const value = parseInt(event.target.value);
                      if (!isNaN(value)) {
                        updateQuantity(entitlement.id, value);
                      }
                    }}
                  />
                </Flex>

                <Box>
                  <Text
                    $font={theme.typography.text.fontFamily}
                    $size={theme.typography.text.fontSize}
                    $weight={theme.typography.text.fontWeight}
                    $color={theme.typography.text.color}
                  >
                    {formatCurrency(
                      (period === "month"
                        ? entitlement.meteredMonthlyPrice
                        : entitlement.meteredYearlyPrice
                      )?.price ?? 0,
                    )}
                  </Text>

                  <Text
                    $font={theme.typography.text.fontFamily}
                    $size={(16 / 30) * theme.typography.text.fontSize}
                    $weight={theme.typography.text.fontWeight}
                    $color={theme.typography.text.color}
                  >
                    /{period}
                  </Text>
                </Box>
              </Flex>,
            );
          }

          return acc;
        }, [])}
      </Box>
    </>
  );
};
