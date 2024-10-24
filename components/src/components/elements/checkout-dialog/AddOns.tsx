import { useTheme } from "styled-components";
import type { CompanyPlanDetailResponseData } from "../../../api";
import { TEXT_BASE_SIZE } from "../../../const";
import { hexToHSL, formatCurrency } from "../../../utils";
import { Box, EmbedButton, Flex, Icon, Text } from "../../ui";

interface AddOnsProps {
  addOns: (CompanyPlanDetailResponseData & {
    isSelected: boolean;
  })[];
  select: (id: string) => void;
  deselect: (id: string) => void;
  isLoading: boolean;
}

export const AddOns = ({
  addOns,
  select,
  deselect,
  isLoading,
}: AddOnsProps) => {
  const theme = useTheme();

  return (
    <>
      <Flex $flexDirection="column" $gap="1rem" $marginBottom="1rem">
        <Text
          as="h3"
          id="select-addons-dialog-label"
          $font={theme.typography.heading3.fontFamily}
          $size={theme.typography.heading3.fontSize}
          $weight={theme.typography.heading3.fontWeight}
          $color={theme.typography.heading3.color}
          $marginBottom="0.5rem"
        >
          Customize with addons
        </Text>

        <Text
          as="p"
          id="select-addons-dialog-description"
          $font={theme.typography.text.fontFamily}
          $size={theme.typography.text.fontSize}
          $weight={theme.typography.text.fontWeight}
          $color={theme.typography.text.color}
        >
          Optionally add features to your subscription
        </Text>
      </Flex>

      <Flex $flexWrap="wrap" $gap="1rem">
        {addOns.map((addOn) => {
          return (
            <Flex
              key={addOn.id}
              $flexDirection="column"
              $width="100%"
              $minWidth="280px"
              $maxWidth={`calc(${100 / 3}% - 1rem)`}
              $backgroundColor={theme.card.background}
              $outlineWidth="2px"
              $outlineStyle="solid"
              $outlineColor={addOn.isSelected ? theme.primary : "transparent"}
              $borderRadius={`${theme.card.borderRadius / TEXT_BASE_SIZE}rem`}
              {...(theme.card.hasShadow && {
                $boxShadow:
                  "0px 1px 3px rgba(16, 24, 40, 0.1), 0px 1px 20px rgba(16, 24, 40, 0.06)",
              })}
            >
              <Flex
                $flexDirection="column"
                $position="relative"
                $gap="1rem"
                $width="100%"
                $padding={`${theme.card.padding / TEXT_BASE_SIZE}rem`}
              >
                <Text $size={20} $weight={600}>
                  {addOn.name}
                </Text>

                {addOn.description && (
                  <Text $size={14}>{addOn.description}</Text>
                )}

                {addOn.planPrice && (
                  <Text>
                    <Box $display="inline-block" $fontSize="1.5rem">
                      {formatCurrency(addOn.planPrice ?? 0)}
                    </Box>

                    {addOn.planPeriod && (
                      <Box $display="inline-block" $fontSize="0.75rem">
                        /{addOn.planPeriod}
                      </Box>
                    )}
                  </Text>
                )}

                {addOn.current && (
                  <Flex
                    $position="absolute"
                    $right="1rem"
                    $top="1rem"
                    $fontSize="0.625rem"
                    $color={
                      hexToHSL(theme.primary).l > 50 ? "#000000" : "#FFFFFF"
                    }
                    $backgroundColor={theme.primary}
                    $borderRadius="9999px"
                    $padding="0.125rem 0.85rem"
                  >
                    Active
                  </Flex>
                )}
              </Flex>

              <Flex
                $flexDirection="column"
                $position="relative"
                $gap="1rem"
                $width="100%"
                $padding="1.5rem"
              >
                {!addOn.isSelected ? (
                  <EmbedButton
                    disabled={isLoading}
                    onClick={() => select(addOn.id)}
                    $size="sm"
                    $color="primary"
                    $variant="outline"
                  >
                    Select
                  </EmbedButton>
                ) : (
                  <EmbedButton
                    disabled={isLoading}
                    onClick={() => deselect(addOn.id)}
                    $size="sm"
                    $color="primary"
                    $variant="text"
                  >
                    <Icon
                      name="check-rounded"
                      style={{
                        fontSize: 20,
                        lineHeight: "1",
                      }}
                    />

                    <Text
                      $lineHeight="1.4"
                      $color={theme.typography.text.color}
                    >
                      Selected
                    </Text>
                  </EmbedButton>
                )}
              </Flex>
            </Flex>
          );
        })}
      </Flex>
    </>
  );
};
