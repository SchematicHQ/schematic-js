import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components";

import type { CompanyPlanDetailResponseData } from "../../../api";
import { TEXT_BASE_SIZE } from "../../../const";
import {
  ChargeType,
  formatCurrency,
  getAddOnPrice,
  getBillingPrice,
  hexToHSL,
} from "../../../utils";
import { cardBoxShadow } from "../../layout";
import { Box, EmbedButton, Flex, Icon, Text } from "../../ui";

interface AddOnsProps {
  addOns: (CompanyPlanDetailResponseData & { isSelected: boolean })[];
  toggle: (id: string) => void;
  isLoading: boolean;
  period: string;
}

export const AddOns = ({ addOns, toggle, isLoading, period }: AddOnsProps) => {
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
        {addOns.map((addOn, index) => {
          const { price, currency } =
            getBillingPrice(getAddOnPrice(addOn, period)) || {};

          return (
            <Flex
              key={index}
              $position="relative"
              $flexDirection="column"
              $gap="2rem"
              $padding={`${cardPadding}rem`}
              $backgroundColor={theme.card.background}
              $borderRadius={`${theme.card.borderRadius / TEXT_BASE_SIZE}rem`}
              $outlineWidth="2px"
              $outlineStyle="solid"
              $outlineColor={addOn.isSelected ? theme.primary : "transparent"}
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
                    {addOn.name}
                  </Text>
                </Box>

                {addOn.description && (
                  <Box $marginBottom="0.5rem">
                    <Text
                      $font={theme.typography.text.fontFamily}
                      $size={theme.typography.text.fontSize}
                      $weight={theme.typography.text.fontWeight}
                      $color={theme.typography.text.color}
                    >
                      {addOn.description}
                    </Text>
                  </Box>
                )}

                {(addOn[periodKey] ||
                  addOn.chargeType === ChargeType.oneTime) && (
                  <Box>
                    <Text
                      $font={theme.typography.heading2.fontFamily}
                      $size={theme.typography.heading2.fontSize}
                      $weight={theme.typography.heading2.fontWeight}
                      $color={theme.typography.heading2.color}
                    >
                      {formatCurrency(price ?? 0, currency)}
                    </Text>

                    <Text
                      $font={theme.typography.heading2.fontFamily}
                      $size={(16 / 30) * theme.typography.heading2.fontSize}
                      $weight={theme.typography.heading2.fontWeight}
                      $color={theme.typography.heading2.color}
                    >
                      {addOn.chargeType === ChargeType.oneTime ? (
                        <> {t("one time")}</>
                      ) : (
                        `/${period}`
                      )}
                    </Text>
                  </Box>
                )}

                {addOn.current && (
                  <Flex
                    $position="absolute"
                    $right="1rem"
                    $top="1rem"
                    $backgroundColor={theme.primary}
                    $borderRadius="9999px"
                    $padding="0.125rem 0.85rem"
                  >
                    <Text
                      $font={theme.typography.text.fontFamily}
                      $size={0.75 * theme.typography.text.fontSize}
                      $weight={theme.typography.text.fontWeight}
                      $color={
                        hexToHSL(theme.primary).l > 50 ? "#000000" : "#FFFFFF"
                      }
                    >
                      {t("Active")}
                    </Text>
                  </Flex>
                )}
              </Flex>

              <Flex $flexDirection="column" $justifyContent="end" $flexGrow="1">
                {!addOn.isSelected ? (
                  <EmbedButton
                    type="button"
                    disabled={isLoading || !addOn.valid}
                    onClick={() => toggle(addOn.id)}
                    $size="sm"
                    $color="primary"
                    $variant="outline"
                  >
                    {t("Choose add-on")}
                  </EmbedButton>
                ) : (
                  <EmbedButton
                    type="button"
                    disabled={isLoading || !addOn.valid}
                    onClick={() => toggle(addOn.id)}
                    $size="sm"
                    $color={addOn.current ? "danger" : "primary"}
                    $variant={addOn.current ? "ghost" : "text"}
                  >
                    {addOn.current ? (
                      t("Remove add-on")
                    ) : (
                      <>
                        <Icon
                          name="check-rounded"
                          style={{
                            fontSize: 20,
                            lineHeight: 1,
                          }}
                        />
                        {t("Selected")}
                      </>
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
