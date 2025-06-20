import { useTranslation } from "react-i18next";

import { TEXT_BASE_SIZE } from "../../../const";
import { useEmbed, type SelectedPlan } from "../../../hooks";
import {
  darken,
  formatCurrency,
  getEntitlementPrice,
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
  selectedPlan?: SelectedPlan;
  entitlements: UsageBasedEntitlement[];
  updateQuantity: (id: string, quantity: number) => void;
}

export const Usage = ({ entitlements, updateQuantity, period }: UsageProps) => {
  const { settings } = useEmbed();

  const { t } = useTranslation();

  const cardPadding = settings.theme.card.padding / TEXT_BASE_SIZE;

  const unitPriceFontSize = 0.875 * settings.theme.typography.text.fontSize;
  const unitPriceColor =
    hexToHSL(settings.theme.typography.text.color).l > 50
      ? darken(settings.theme.typography.text.color, 0.46)
      : lighten(settings.theme.typography.text.color, 0.46);

  return (
    <>
      <Flex $flexDirection="column" $gap="1rem">
        {entitlements.reduce(
          (acc: React.ReactElement[], entitlement, index) => {
            if (entitlement.feature) {
              const {
                price,
                currency,
                packageSize = 1,
              } = getEntitlementPrice(entitlement, period) || {};

              acc.push(
                <Flex
                  key={index}
                  $justifyContent="space-between"
                  $alignItems="center"
                  $gap="1rem"
                  $padding={`${cardPadding}rem`}
                  $backgroundColor={settings.theme.card.background}
                  $borderRadius={`${settings.theme.card.borderRadius / TEXT_BASE_SIZE}rem`}
                  {...(settings.theme.card.hasShadow && {
                    $boxShadow: cardBoxShadow,
                  })}
                >
                  <Flex
                    $flexDirection="column"
                    $gap="0.75rem"
                    $flexBasis={`calc(${100 / 3}% - 0.375rem)`}
                  >
                    <Box>
                      <Text display="heading2">{entitlement.feature.name}</Text>
                    </Box>

                    {entitlement.feature.description && (
                      <Box $marginBottom="0.5rem">
                        <Text>{entitlement.feature.description}</Text>
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
                      min={1}
                      autoFocus
                      onFocus={(event) => {
                        event.target.select();
                      }}
                      onChange={(event) => {
                        event.preventDefault();

                        const value = parseInt(event.target.value);
                        if (!isNaN(value)) {
                          updateQuantity(entitlement.id, value);
                        }
                      }}
                    />

                    <Text $size={unitPriceFontSize} $color={unitPriceColor}>
                      {t("Currently using", {
                        quantity: entitlement.usage,
                        unit: getFeatureName(entitlement.feature),
                      })}
                    </Text>

                    <Text $size={unitPriceFontSize} $color="#DB6669">
                      {entitlement.quantity < entitlement.usage &&
                        t("Cannot downgrade entitlement")}
                    </Text>
                  </Flex>

                  <Box
                    $flexBasis={`calc(${100 / 3}% - 0.375rem)`}
                    $textAlign="right"
                  >
                    <Box $whiteSpace="nowrap">
                      <Text>
                        {formatCurrency(
                          (price ?? 0) * entitlement.quantity,
                          currency,
                        )}
                        <sub>/{shortenPeriod(period)}</sub>
                      </Text>
                    </Box>

                    <Box $whiteSpace="nowrap">
                      <Text $size={unitPriceFontSize} $color={unitPriceColor}>
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
