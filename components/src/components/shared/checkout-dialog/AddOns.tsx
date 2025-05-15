import { useTranslation } from "react-i18next";

import { TEXT_BASE_SIZE } from "../../../const";
import { useEmbed, type SelectedPlan } from "../../../hooks";
import {
  ChargeType,
  formatCurrency,
  getAddOnPrice,
  getBillingPrice,
  hexToHSL,
  isHydratedPlan,
} from "../../../utils";
import { cardBoxShadow } from "../../layout";
import { Box, Button, Flex, Icon, Text } from "../../ui";

interface AddOnsProps {
  addOns: SelectedPlan[];
  toggle: (id: string) => void;
  isLoading: boolean;
  period: string;
}

export const AddOns = ({ addOns, toggle, isLoading, period }: AddOnsProps) => {
  const { t } = useTranslation();

  const { settings } = useEmbed();

  const periodKey = period === "year" ? "yearlyPrice" : "monthlyPrice";

  const cardPadding = settings.theme.card.padding / TEXT_BASE_SIZE;

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
          const isAddOnValid = isHydratedPlan(addOn) && addOn.valid;
          const isAddOnCurrent = isHydratedPlan(addOn) && addOn.current;

          return (
            <Flex
              key={index}
              $position="relative"
              $flexDirection="column"
              $gap="2rem"
              $padding={`${cardPadding}rem`}
              $backgroundColor={settings.theme.card.background}
              $borderRadius={`${settings.theme.card.borderRadius / TEXT_BASE_SIZE}rem`}
              $outlineWidth="2px"
              $outlineStyle="solid"
              $outlineColor={
                addOn.isSelected ? settings.theme.primary : "transparent"
              }
              {...(settings.theme.card.hasShadow && {
                $boxShadow: cardBoxShadow,
              })}
            >
              <Flex $flexDirection="column" $gap="0.75rem">
                <Box>
                  <Text display="heading3">{addOn.name}</Text>
                </Box>

                {addOn.description && (
                  <Box $marginBottom="0.5rem">
                    <Text>{addOn.description}</Text>
                  </Box>
                )}

                {(addOn[periodKey] ||
                  addOn.chargeType === ChargeType.oneTime) && (
                  <Box>
                    <Text display="heading2">
                      {formatCurrency(price ?? 0, currency)}
                    </Text>

                    <Text
                      display="heading2"
                      $size={
                        (16 / 30) * settings.theme.typography.heading2.fontSize
                      }
                    >
                      {addOn.chargeType === ChargeType.oneTime ? (
                        <> {t("one time")}</>
                      ) : (
                        `/${period}`
                      )}
                    </Text>
                  </Box>
                )}

                {isAddOnCurrent && (
                  <Flex
                    $position="absolute"
                    $right="1rem"
                    $top="1rem"
                    $backgroundColor={settings.theme.primary}
                    $borderRadius="9999px"
                    $padding="0.125rem 0.85rem"
                  >
                    <Text
                      $size={0.75 * settings.theme.typography.text.fontSize}
                      $color={
                        hexToHSL(settings.theme.primary).l > 50
                          ? "#000000"
                          : "#FFFFFF"
                      }
                    >
                      {t("Active")}
                    </Text>
                  </Flex>
                )}
              </Flex>

              <Flex $flexDirection="column" $justifyContent="end" $flexGrow="1">
                {!addOn.isSelected ? (
                  <Button
                    type="button"
                    disabled={isLoading || !isAddOnValid}
                    onClick={() => toggle(addOn.id)}
                    $size="sm"
                    $color="primary"
                    $variant="outline"
                  >
                    {t("Choose add-on")}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    disabled={isLoading || !isAddOnValid}
                    onClick={() => toggle(addOn.id)}
                    $size="sm"
                    $color={isAddOnCurrent ? "danger" : "primary"}
                    $variant={isAddOnCurrent ? "ghost" : "text"}
                  >
                    {isAddOnCurrent ? (
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
                  </Button>
                )}
              </Flex>
            </Flex>
          );
        })}
      </Box>
    </>
  );
};
