import { TEXT_BASE_SIZE } from "../../../const";
import { useEmbed } from "../../../hooks";
import type { CreditBundle } from "../../../types";
import { formatCurrency, getFeatureName } from "../../../utils";
import { cardBoxShadow } from "../../layout";
import { Box, Flex, Input, Text } from "../../ui";

interface CreditsProps {
  isLoading: boolean;
  bundles: CreditBundle[];
  updateCount: (id: string, count: number) => void;
}

export const Credits = ({ bundles, updateCount }: CreditsProps) => {
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

        return (
          <Flex
            key={index}
            $position="relative"
            $flexDirection="column"
            $gap="2rem"
            $padding={`${cardPadding}rem`}
            $backgroundColor={settings.theme.card.background}
            $borderRadius={`${settings.theme.card.borderRadius / TEXT_BASE_SIZE}rem`}
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
                    {bundle.quantity ?? 0} {getFeatureName(bundle)}
                  </Text>
                </Box>
              </Box>

              {typeof price === "number" && (
                <Box $marginBottom="0.5rem">
                  <Text>{formatCurrency(price, bundle.price?.currency)}</Text>
                </Box>
              )}
            </Flex>

            <Flex $flexDirection="column" $justifyContent="end" $flexGrow="1">
              <Input
                $size="lg"
                type="number"
                value={bundle.count}
                min={0}
                autoFocus
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
            </Flex>
          </Flex>
        );
      })}
    </Box>
  );
};
