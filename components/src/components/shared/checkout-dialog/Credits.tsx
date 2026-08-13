import { useTranslation } from "react-i18next";

import { TEXT_BASE_SIZE } from "../../../const";
import { useEmbed } from "../../../hooks";
import type { CreditBundle } from "../../../types";
import { formatCurrency, formatNumber, getFeatureName } from "../../../utils";
import { cardBoxShadow } from "../../layout";
import { Box, Button, Flex, Icon, Input, Text } from "../../ui";

interface CreditsProps {
  isLoading: boolean;
  bundles: CreditBundle[];
  isIndividualPurchase: boolean;
  updateCount: (id: string, count: number) => void;
  toggle: (id: string) => void;
  currency?: string;
}

export const Credits = ({
  isLoading,
  bundles,
  isIndividualPurchase,
  updateCount,
  toggle,
  currency,
}: CreditsProps) => {
  const { t } = useTranslation();
  const { settings } = useEmbed();

  const cardPadding = settings.theme.card.padding / TEXT_BASE_SIZE;

  return (
    <Box
      $display="grid"
      $gridTemplateColumns="repeat(auto-fill, minmax(300px, 1fr))"
      $gap="1rem"
    >
      {bundles.map((bundle, index) => {
        const billingPrice = bundle.price;
        const price =
          typeof billingPrice?.priceDecimal === "string"
            ? Number(billingPrice.priceDecimal)
            : typeof billingPrice?.price === "number"
              ? billingPrice.price
              : undefined;
        const isSelected = bundle.count > 0;

        return (
          <Flex
            key={bundle.id}
            $position="relative"
            $flexDirection="column"
            $gap="2rem"
            $padding={`${cardPadding}rem`}
            $backgroundColor={settings.theme.card.background}
            $borderRadius={`${settings.theme.card.borderRadius / TEXT_BASE_SIZE}rem`}
            {...(isIndividualPurchase && {
              $outlineWidth: "2px",
              $outlineStyle: "solid",
              $outlineColor: isSelected
                ? settings.theme.primary
                : "transparent",
            })}
            {...(settings.theme.card.hasShadow && {
              $boxShadow: cardBoxShadow,
            })}
          >
            <Flex $flexDirection="column" $gap="0.75rem">
              <Box>
                <Box>
                  <Text display="heading3">{bundle.name}</Text>
                </Box>
                <Box>
                  <Text display="heading6">
                    {formatNumber(bundle.quantity ?? 0)}{" "}
                    {getFeatureName(bundle)}
                  </Text>
                </Box>
              </Box>

              {typeof price === "number" && (
                <Box $marginBottom="0.5rem">
                  <Text>
                    {formatCurrency(price, currency || bundle.price?.currency)}
                  </Text>
                </Box>
              )}
            </Flex>

            <Flex $flexDirection="column" $justifyContent="end" $flexGrow={1}>
              {isIndividualPurchase ? (
                <Button
                  type="button"
                  disabled={isLoading}
                  onClick={() => {
                    toggle(bundle.id);
                  }}
                  $size="sm"
                  $color="primary"
                  $variant={isSelected ? "text" : "outline"}
                  $fullWidth
                >
                  {isSelected ? (
                    <>
                      <Icon name="check-rounded" size="sm" />
                      {t("Bundle selected")}
                    </>
                  ) : (
                    t("Choose bundle")
                  )}
                </Button>
              ) : (
                <Input
                  $size="lg"
                  type="number"
                  value={bundle.count}
                  min={0}
                  autoFocus={index === 0}
                  onFocus={(event) => {
                    event.target.select();
                  }}
                  onChange={(event) => {
                    event.preventDefault();

                    const value = parseInt(event.target.value);
                    if (!isNaN(value)) {
                      updateCount(bundle.id, value);
                    }
                  }}
                />
              )}
            </Flex>
          </Flex>
        );
      })}
    </Box>
  );
};
