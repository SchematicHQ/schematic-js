import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components";
import pluralize from "pluralize";
import type {
  CompanyPlanDetailResponseData,
  PlanEntitlementResponseData,
} from "../../../api";
import { TEXT_BASE_SIZE } from "../../../const";
import {
  hexToHSL,
  lighten,
  darken,
  formatCurrency,
  shortenPeriod,
} from "../../../utils";
import { cardBoxShadow } from "../../layout";
import { Box, Flex, Input, Text } from "../../ui";

interface UsageProps {
  isLoading: boolean;
  period: string;
  selectedPlan?: CompanyPlanDetailResponseData & { isSelected: boolean };
  entitlements: {
    entitlement: PlanEntitlementResponseData;
    allocation: number;
    quantity: number;
    usage: number;
  }[];
  updateQuantity: (id: string, quantity: number) => void;
}

export const Usage = ({ entitlements, updateQuantity, period }: UsageProps) => {
  const theme = useTheme();

  const { t } = useTranslation();

  const cardPadding = theme.card.padding / TEXT_BASE_SIZE;

  const unitPriceFontSize = 0.875 * theme.typography.text.fontSize;
  const unitPriceColor =
    hexToHSL(theme.typography.text.color).l > 50
      ? darken(theme.typography.text.color, 0.46)
      : lighten(theme.typography.text.color, 0.46);

  return (
    <>
      <Flex $flexDirection="column" $gap="1rem">
        {entitlements
          .slice()
          .sort((a, b) => {
            if (
              a.entitlement.feature?.name &&
              b.entitlement.feature?.name &&
              a.entitlement.feature?.name > b.entitlement.feature?.name
            ) {
              return 1;
            }

            if (
              a.entitlement.feature?.name &&
              b.entitlement.feature?.name &&
              a.entitlement.feature?.name < b.entitlement.feature?.name
            ) {
              return -1;
            }

            return 0;
          })
          .reduce((acc: JSX.Element[], { entitlement, quantity, usage }) => {
            if (
              entitlement.priceBehavior === "pay_in_advance" &&
              entitlement.feature
            ) {
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

                  <Flex $flexDirection="column" $gap="0.5rem">
                    <Input
                      type="number"
                      value={quantity}
                      min={usage}
                      autoFocus
                      onFocus={(event) => event.target.select()}
                      onChange={(event) => {
                        event.preventDefault();

                        const value = parseInt(event.target.value);
                        if (!isNaN(value)) {
                          updateQuantity(entitlement.id, value);
                        }
                      }}
                    />

                    <Box>
                      <Text
                        $font={theme.typography.text.fontFamily}
                        $size={unitPriceFontSize}
                        $weight={theme.typography.text.fontWeight}
                        $color={unitPriceColor}
                      >
                        {quantity < usage && (
                          <span style={{ color: "#DB6669" }}>
                            {t("Cannot downgrade entitlement")}{" "}
                          </span>
                        )}
                        {t("Currently using", {
                          quantity: usage,
                          unit: pluralize(
                            entitlement.feature.name.toLowerCase(),
                          ),
                        })}
                      </Text>
                    </Box>
                  </Flex>

                  <Box>
                    <Box $whiteSpace="nowrap">
                      <Text
                        $font={theme.typography.text.fontFamily}
                        $size={theme.typography.text.fontSize}
                        $weight={theme.typography.text.fontWeight}
                        $color={theme.typography.text.color}
                      >
                        {formatCurrency(
                          ((period === "month"
                            ? entitlement.meteredMonthlyPrice
                            : entitlement.meteredYearlyPrice
                          )?.price || 0) * quantity,
                        )}
                        <sub>/{shortenPeriod(period)}</sub>
                      </Text>
                    </Box>

                    <Box $whiteSpace="nowrap">
                      <Text
                        $font={theme.typography.text.fontFamily}
                        $size={unitPriceFontSize}
                        $weight={theme.typography.text.fontWeight}
                        $color={unitPriceColor}
                      >
                        {formatCurrency(
                          (period === "month"
                            ? entitlement.meteredMonthlyPrice
                            : entitlement.meteredYearlyPrice
                          )?.price || 0,
                        )}
                        <sub>
                          /
                          {pluralize(entitlement.feature.name.toLowerCase(), 1)}
                          /{shortenPeriod(period)}
                        </sub>
                      </Text>
                    </Box>
                  </Box>
                </Flex>,
              );
            }

            return acc;
          }, [])}
      </Flex>
    </>
  );
};
