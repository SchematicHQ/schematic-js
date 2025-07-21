// import { useTranslation } from "react-i18next";

import { type BillingCreditBundleView } from "../../../api/checkoutexternal";
import { TEXT_BASE_SIZE } from "../../../const";
import { useEmbed } from "../../../hooks";
/* import {
  formatCurrency,
  getEntitlementPrice,
  getFeatureName,
  shortenPeriod,
} from "../../../utils"; */
import { cardBoxShadow } from "../../layout";
import { Box, Flex, Input, Text } from "../../ui";

interface CreditsProps {
  isLoading: boolean;
  period: string;
  credits: BillingCreditBundleView[];
  updateQuantity: (id: string, quantity: number) => void;
}

export const Credits = ({ credits, updateQuantity }: CreditsProps) => {
  const { settings } = useEmbed();

  // const { t } = useTranslation();

  const cardPadding = settings.theme.card.padding / TEXT_BASE_SIZE;

  // const unitPriceFontSize = 0.875 * settings.theme.typography.text.fontSize;

  return (
    <>
      <Flex $flexDirection="column" $gap="1rem">
        {credits.map((bundle, index) => {
          const quantity = bundle.quantity || 0;

          return (
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
                  <Text display="heading2">{bundle.name}</Text>
                </Box>
              </Flex>

              <Flex
                $flexDirection="column"
                $gap="0.5rem"
                $flexBasis={`calc(${100 / 3}% - 0.375rem)`}
              >
                <Input
                  $size="lg"
                  type="number"
                  value={quantity}
                  min={1}
                  autoFocus
                  onFocus={(event) => {
                    event.target.select();
                  }}
                  onChange={(event) => {
                    event.preventDefault();

                    const value = parseInt(event.target.value);
                    if (!isNaN(value) && value > 0) {
                      updateQuantity(bundle.id, value);
                    }
                  }}
                />

                {/* <Text
                  style={{ opacity: 0.54 }}
                  $size={unitPriceFontSize}
                  $color={settings.theme.typography.text.color}
                >
                  {t("Currently using", {
                    quantity: bundle.usage,
                    unit: getFeatureName(bundle.feature),
                  })}
                </Text>

                {bundle.quantity < bundle.usage && (
                  <Text $size={unitPriceFontSize} $color="#DB6669">
                    {t("Cannot downgrade bundle")}
                  </Text>
                )} */}
              </Flex>

              {/* <Box
                $flexBasis={`calc(${100 / 3}% - 0.375rem)`}
                $textAlign="right"
              >
                <Box $whiteSpace="nowrap">
                  <Text>
                    {formatCurrency((price ?? 0) * bundle.quantity, currency)}
                    <sub>/{shortenPeriod(period)}</sub>
                  </Text>
                </Box>

                <Box $whiteSpace="nowrap">
                  <Text
                    style={{ opacity: 0.54 }}
                    $size={unitPriceFontSize}
                    $color={settings.theme.typography.text.color}
                  >
                    {formatCurrency(price ?? 0, currency)}
                    <sub>
                      /{packageSize > 1 && <>{packageSize} </>}
                      {getFeatureName(bundle.feature, packageSize)}/
                      {shortenPeriod(period)}
                    </sub>
                  </Text>
                </Box>
              </Box> */}
            </Flex>
          );
        }, [])}
      </Flex>
    </>
  );
};
