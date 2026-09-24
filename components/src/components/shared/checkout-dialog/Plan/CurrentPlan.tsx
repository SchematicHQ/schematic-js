import { TEXT_BASE_SIZE } from "../../../../const";
import { useEmbed, useIsLightBackground } from "../../../../hooks";
import {
  useTranslation,
  type SchematicTranslationKey,
} from "../../../../localization";
import type { SelectedPlan } from "../../../../types";
import {
  derivePeriod,
  formatCurrency,
  getPlanPrice,
  hexToHSL,
} from "../../../../utils";
import { cardBoxShadow } from "../../../layout";
import { Box, Button, Flex, Text } from "../../../ui";

import { Selected } from "./Selected";

interface CurrentPlanProps {
  plan: SelectedPlan;
  isLoading: boolean;
  isSelected: boolean;
  onSelect: (updates: { plan: SelectedPlan }) => void;
}

/**
 * The card for keeping a plan that is not in `activePlans` (a custom plan, or
 * one that is no longer live). The plan was never configured for display
 * beside the others, so this says only what choosing it does: stay on the
 * current plan and change something else.
 */
export const CurrentPlan = ({
  plan,
  isLoading,
  isSelected,
  onSelect,
}: CurrentPlanProps) => {
  const { t, locale } = useTranslation();

  const { settings } = useEmbed();

  const isLightBackground = useIsLightBackground();

  const cardPadding = settings.theme.card.padding / TEXT_BASE_SIZE;

  // The plan carries only the price it is billed at, so show that one rather
  // than looking up the selected period.
  const billingPrice = getPlanPrice(plan, undefined, {
    useSelectedPeriod: false,
  });
  const period = derivePeriod(
    billingPrice?.interval,
    billingPrice?.intervalCount,
  );

  return (
    <Flex
      $position="relative"
      $flexDirection="column"
      $padding={`${0.75 * cardPadding}rem 0`}
      $backgroundColor={settings.theme.card.background}
      $borderRadius={`${settings.theme.card.borderRadius / TEXT_BASE_SIZE}rem`}
      $outlineWidth="2px"
      $outlineStyle="solid"
      $outlineColor={isSelected ? settings.theme.primary : "transparent"}
      {...(settings.theme.card.hasShadow && {
        $boxShadow: cardBoxShadow,
      })}
    >
      <Flex
        $flexDirection="column"
        $gap="0.5rem"
        $padding={`0 ${cardPadding}rem ${0.75 * cardPadding}rem`}
        $borderWidth={0}
        $borderBottomWidth="1px"
        $borderStyle="solid"
        $borderColor={
          isLightBackground
            ? "hsla(0, 0%, 0%, 0.175)"
            : "hsla(0, 0%, 100%, 0.175)"
        }
        $viewport={{
          md: {
            $gap: "1rem",
          },
        }}
      >
        <Box>
          <Text display="heading2">{plan.name}</Text>
        </Box>

        {plan.description && (
          <Box $marginBottom="0.5rem" $lineHeight={1.35}>
            <Text>{plan.description}</Text>
          </Box>
        )}

        {billingPrice && period && (
          <Box>
            <Text display="heading2">
              {formatCurrency(billingPrice.price, {
                locale,
                currency: billingPrice.currency,
              })}
            </Text>
            <Text
              display="heading2"
              $size={(16 / 30) * settings.theme.typography.heading2.fontSize}
            >
              /{t(period as SchematicTranslationKey)}
            </Text>
          </Box>
        )}

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
              hexToHSL(settings.theme.primary).l > 50 ? "#000000" : "#FFFFFF"
            }
          >
            {t("Active")}
          </Text>
        </Flex>
      </Flex>

      <Flex
        $flexDirection="column"
        $justifyContent="end"
        $flexGrow={1}
        $padding={`${0.75 * cardPadding}rem ${cardPadding}rem 0`}
      >
        {isSelected ? (
          <Selected isCurrent />
        ) : (
          <Button
            type="button"
            disabled={isLoading}
            onClick={() => onSelect({ plan })}
            $size="sm"
            $color="primary"
            $variant="filled"
            $fullWidth
          >
            {t("Keep current plan")}
          </Button>
        )}
      </Flex>
    </Flex>
  );
};
