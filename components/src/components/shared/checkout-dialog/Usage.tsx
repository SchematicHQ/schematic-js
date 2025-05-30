import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components";

import type { CompanyPlanDetailResponseData } from "../../../api/checkoutexternal";
import { TEXT_BASE_SIZE } from "../../../const";
import {
  darken,
  formatCurrency,
  getBillingPrice,
  getFeatureName,
  hexToHSL,
  lighten,
  shortenPeriod,
} from "../../../utils";
import { cardBoxShadow } from "../../layout";
import { Box, Flex, Input, Text } from "../../ui";
import { type UsageBasedEntitlement } from "../sidebar";

interface UsageProps {
  isLoading: boolean;
  period: string;
  selectedPlan?: CompanyPlanDetailResponseData & { isSelected: boolean };
  entitlements: UsageBasedEntitlement[];
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
        {entitlements.reduce(
          (acc: React.ReactElement[], entitlement, index) => {
            if (
              entitlement.priceBehavior === "pay_in_advance" &&
              entitlement.feature
            ) {
              const {
                price,
                currency,
                packageSize = 1,
              } = getBillingPrice(
                period === "year"
                  ? entitlement.meteredYearlyPrice
                  : entitlement.meteredMonthlyPrice,
              ) || {};

              acc.push(
                <Flex
                  key={index}
                  $justifyContent="space-between"
                  $alignItems="center"
                  $gap="1rem"
                  $padding={`${cardPadding}rem`}
                  $backgroundColor={theme.card.background}
                  $borderRadius={`${theme.card.borderRadius / TEXT_BASE_SIZE}rem`}
                  {...(theme.card.hasShadow && { $boxShadow: cardBoxShadow })}
                >
                  <Flex
                    $flexDirection="column"
                    $gap="0.75rem"
                    $flexBasis={`calc(${100 / 3}% - 0.375rem)`}
                  >
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

                  <Flex
                    $flexDirection="column"
                    $gap="0.5rem"
                    $flexBasis={`calc(${100 / 3}% - 0.375rem)`}
                  >
                    <Input
                      $size="lg"
                      type="number"
                      value={entitlement.quantity}
                      min={entitlement.usage}
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
                        {entitlement.quantity < entitlement.usage && (
                          <span style={{ color: "#DB6669" }}>
                            {t("Cannot downgrade entitlement")}{" "}
                          </span>
                        )}
                        {t("Currently using", {
                          quantity: entitlement.usage,
                          unit: getFeatureName(entitlement.feature),
                        })}
                      </Text>
                    </Box>
                  </Flex>

                  <Box
                    $flexBasis={`calc(${100 / 3}% - 0.375rem)`}
                    $textAlign="right"
                  >
                    <Box $whiteSpace="nowrap">
                      <Text
                        $font={theme.typography.text.fontFamily}
                        $size={theme.typography.text.fontSize}
                        $weight={theme.typography.text.fontWeight}
                        $color={theme.typography.text.color}
                      >
                        {formatCurrency(
                          (price ?? 0) * entitlement.quantity,
                          currency,
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
                        {formatCurrency(price ?? 0, currency)}
                        <sub>
                          /{packageSize > 1 && <>{packageSize} </>}
                          {getFeatureName(entitlement.feature, packageSize)}/
                          {shortenPeriod(period)}
                        </sub>
                      </Text>
                    </Box>
                  </Box>
                </Flex>,
              );
            }

            return acc;
          },
          [],
        )}
      </Flex>
    </>
  );
};
