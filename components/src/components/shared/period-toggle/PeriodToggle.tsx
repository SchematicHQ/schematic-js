import { useTheme } from "styled-components";
import { useIsLightBackground } from "../../../hooks";
import { Flex, Text } from "../../ui";

interface PeriodToggleProps {
  period: string;
  changePeriod: (period: string) => void;
}

export const PeriodToggle = ({ period, changePeriod }: PeriodToggleProps) => {
  const theme = useTheme();

  const isLightBackground = useIsLightBackground();

  return (
    <Flex
      $borderWidth="1px"
      $borderStyle="solid"
      $borderColor={
        isLightBackground ? "hsla(0, 0%, 0%, 0.1)" : "hsla(0, 0%, 100%, 0.2)"
      }
      $borderRadius="2.5rem"
      $cursor="pointer"
    >
      <Flex
        onClick={() => changePeriod("month")}
        $justifyContent="center"
        $alignItems="center"
        $padding="0.25rem 0.5rem"
        {...(period === "month" && {
          $backgroundColor: isLightBackground
            ? "hsla(0, 0%, 0%, 0.075)"
            : "hsla(0, 0%, 100%, 0.15)",
        })}
        $borderRadius="2.5rem"
      >
        <Text
          $font={theme.typography.text.fontFamily}
          $size={14}
          $weight={period === "month" ? 600 : 400}
          $color={theme.typography.text.color}
        >
          Billed monthly
        </Text>
      </Flex>

      <Flex
        onClick={() => changePeriod("year")}
        $justifyContent="center"
        $alignItems="center"
        $padding="0.25rem 0.5rem"
        {...(period === "year" && {
          $backgroundColor: isLightBackground
            ? "hsla(0, 0%, 0%, 0.075)"
            : "hsla(0, 0%, 100%, 0.15)",
        })}
        $borderRadius="2.5rem"
      >
        <Text
          $font={theme.typography.text.fontFamily}
          $size={14}
          $weight={period === "year" ? 600 : 400}
          $color={theme.typography.text.color}
        >
          Billed yearly
        </Text>
      </Flex>
    </Flex>
  );
};
