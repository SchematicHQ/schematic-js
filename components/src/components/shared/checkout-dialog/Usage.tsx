import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components";
import type {
  PlanEntitlementResponseData,
  CompanyPlanDetailResponseData,
} from "../../../api";
import { TEXT_BASE_SIZE } from "../../../const";
import type { RecursivePartial } from "../../../types";
import { formatCurrency } from "../../../utils";
import { cardBoxShadow } from "../../layout";
import { Box, Flex, Text } from "../../ui";

interface UsageProps {
  selectedPlan?: CompanyPlanDetailResponseData;
  usageBasedEntitlements: (RecursivePartial<PlanEntitlementResponseData> & {
    isSelected: boolean;
  })[];
  updateQuantity: (id: string) => void;
  isLoading: boolean;
  period: string;
}

export const Usage = ({
  selectedPlan,
  usageBasedEntitlements,
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
        $gridTemplateColumns="repeat(auto-fill, minmax(300px, 1fr))"
        $gap="1rem"
      >
        {selectedPlan?.entitlements.reduce(
          (acc: JSX.Element[], entitlement) => {
            console.debug(entitlement.priceBehavior, entitlement.valueType);
            if (entitlement.feature) {
              acc.push(
                <Flex
                  key={entitlement.id}
                  $gap="1rem"
                  $padding={`${cardPadding}rem`}
                  $backgroundColor={theme.card.background}
                  $borderRadius={`${theme.card.borderRadius / TEXT_BASE_SIZE}rem`}
                  {...(theme.card.hasShadow && { $boxShadow: cardBoxShadow })}
                >
                  <Flex $flexDirection="column" $gap="0.75rem">
                    <Box>
                      <Text
                        $font={theme.typography.heading3.fontFamily}
                        $size={theme.typography.heading3.fontSize}
                        $weight={theme.typography.heading3.fontWeight}
                        $color={theme.typography.heading3.color}
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

                  <Flex
                    $flexDirection="column"
                    $justifyContent="end"
                    $flexGrow="1"
                  >
                    {
                      // TODO: quantity input
                    }
                  </Flex>

                  <Box>
                    <Text
                      $font={theme.typography.heading2.fontFamily}
                      $size={theme.typography.heading2.fontSize}
                      $weight={theme.typography.heading2.fontWeight}
                      $color={theme.typography.heading2.color}
                    >
                      {formatCurrency(
                        (period === "month"
                          ? entitlement.meteredMonthlyPrice
                          : entitlement.meteredYearlyPrice
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
                </Flex>,
              );
            }

            return acc;
          },
          [],
        )}
      </Box>
    </>
  );
};
