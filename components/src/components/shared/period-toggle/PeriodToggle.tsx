import { useLayoutEffect, useMemo, useState } from "react";
import { useTheme } from "styled-components";
import { type CompanyPlanDetailResponseData } from "../../../api";
import { useIsLightBackground } from "../../../hooks";
import { adjectify } from "../../../utils";
import { Flex, Text, Tooltip } from "../../ui";

interface PeriodToggleProps {
  options: string[];
  selectedOption: string;
  selectedPlan?: CompanyPlanDetailResponseData;
  onChange: (period: string) => void;
  layerRef?: React.RefObject<HTMLDivElement>;
}

export const PeriodToggle = ({
  options,
  selectedOption,
  selectedPlan,
  onChange,
  layerRef,
}: PeriodToggleProps) => {
  const theme = useTheme();

  const isLightBackground = useIsLightBackground();

  const [tooltipZIndex, setTooltipZIndex] = useState<number>(1);

  const savingsPercentage = useMemo(() => {
    if (selectedPlan) {
      const monthly = (selectedPlan?.monthlyPrice?.price || 0) * 12;
      const yearly = selectedPlan?.yearlyPrice?.price || 0;
      return Math.round(((monthly - yearly) / monthly) * 10000) / 100;
    }

    return 0;
  }, [selectedPlan]);

  useLayoutEffect(() => {
    const element = layerRef?.current;
    if (element) {
      const style = getComputedStyle(element);
      const value = style.getPropertyValue("z-index");
      setTooltipZIndex(parseInt(value) + 1);
    }
  }, [layerRef]);

  return (
    <Flex
      $margin={0}
      $backgroundColor={theme.card.background}
      $borderWidth="1px"
      $borderStyle="solid"
      $borderColor={
        isLightBackground ? "hsl(0, 0%, 92.5%)" : "hsl(0, 0%, 7.5%)"
      }
      $borderRadius="2.5rem"
      $cursor="pointer"
      $viewport={{
        md: {
          $width: "fit-content",
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
            $flexGrow={1}
            $whiteSpace="nowrap"
            $padding="0.75rem 1rem"
            {...(option === selectedOption && {
              $backgroundColor: isLightBackground
                ? "hsl(0, 0%, 92.5%)"
                : "hsl(0, 0%, 7.5%)",
            })}
            $borderRadius="2.5rem"
            $viewport={{
              md: {
                $padding: "0.375rem 1rem",
              },
            }}
          >
            <Text
              $flexShrink={0}
              $font={theme.typography.text.fontFamily}
              $size={15}
              $weight={option === selectedOption ? 600 : 400}
              $color={theme.typography.text.color}
            >
              Billed {adjectify(option)}
            </Text>
          </Flex>
        );

        if (option === "year" && savingsPercentage > 0) {
          return (
            <Tooltip
              key={option}
              trigger={element}
              content={
                <Text
                  $font={theme.typography.text.fontFamily}
                  $size={11}
                  $weight={theme.typography.text.fontWeight}
                  $color={theme.primary}
                  $leading={1}
                >
                  {selectedOption === "month"
                    ? `Save up to ${savingsPercentage}% with yearly billing`
                    : `You are saving ${savingsPercentage}% with yearly billing`}
                </Text>
              }
              zIndex={tooltipZIndex}
              $flexGrow={1}
            />
          );
        }

        return element;
      })}
    </Flex>
  );
};
