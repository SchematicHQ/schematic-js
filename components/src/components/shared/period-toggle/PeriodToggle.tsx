import { useTheme } from "styled-components";
import { type CompanyPlanDetailResponseData } from "../../../api";
import { useIsLightBackground } from "../../../hooks";
import { adjectify } from "../../../utils";
import { Savings } from "../../shared";
import { Flex, Text, Tooltip } from "../../ui";

interface PeriodToggleProps {
  options: string[];
  selectedOption: string;
  selectedPlan?: CompanyPlanDetailResponseData;
  onChange: (period: string) => void;
}

export const PeriodToggle = ({
  options,
  selectedOption,
  selectedPlan,
  onChange,
}: PeriodToggleProps) => {
  const theme = useTheme();

  const isLightBackground = useIsLightBackground();

  return (
    <Flex
      $width="fit-content"
      $margin="0 auto"
      $backgroundColor={theme.card.background}
      $borderWidth="1px"
      $borderStyle="solid"
      $borderColor={
        isLightBackground ? "hsl(0, 0%, 92.5%)" : "hsl(0, 0%, 7.5%)"
      }
      $borderRadius="2.5rem"
      $cursor="pointer"
      $viewport={{
        sm: {
          $margin: 0,
        },
      }}
    >
      {options.map((option) => {
        const element = (
          <Flex
            key={option}
            tabIndex={0}
            onClick={() => onChange(option)}
            $justifyContent="center"
            $alignItems="center"
            $padding="0.375rem 1rem"
            {...(option === selectedOption && {
              $backgroundColor: isLightBackground
                ? "hsl(0, 0%, 92.5%)"
                : "hsl(0, 0%, 7.5%)",
            })}
            $borderRadius="2.5rem"
          >
            <Text
              $flexShrink="0"
              $font={theme.typography.text.fontFamily}
              $size={14}
              $weight={option === selectedOption ? 600 : 400}
              $color={theme.typography.text.color}
            >
              Billed {adjectify(option)}
            </Text>
          </Flex>
        );

        if (option === "year") {
          return (
            <Tooltip
              label={element}
              description={
                <Savings plan={selectedPlan} period={selectedOption} />
              }
            />
          );
        }

        return element;
      })}
    </Flex>
  );
};
