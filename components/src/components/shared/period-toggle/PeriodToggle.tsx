import { useLayoutEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  useEmbed,
  useIsLightBackground,
  type SelectedPlan,
} from "../../../hooks";
import { adjectify, getBillingPrice } from "../../../utils";
import { Flex, Text, Tooltip } from "../../ui";

interface PeriodToggleProps {
  options: string[];
  selectedOption: string;
  selectedPlan?: SelectedPlan;
  onChange: (period: string) => void;
  layerRef?: React.RefObject<HTMLDivElement | null>;
}

export const PeriodToggle = ({
  options,
  selectedOption,
  selectedPlan,
  onChange,
  layerRef,
}: PeriodToggleProps) => {
  const { t } = useTranslation();

  const { settings } = useEmbed();

  const isLightBackground = useIsLightBackground();

  const [tooltipZIndex, setTooltipZIndex] = useState<number>(1);

  const savingsPercentage = useMemo(() => {
    if (selectedPlan) {
      const monthlyBillingPrice = getBillingPrice(selectedPlan?.monthlyPrice);
      const yearlyBillingPrice = getBillingPrice(selectedPlan?.yearlyPrice);
      const monthly = (monthlyBillingPrice?.price ?? 0) * 12;
      const yearly = yearlyBillingPrice?.price ?? 0;
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
      $backgroundColor={settings.theme.card.background}
      $borderWidth="1px"
      $borderStyle="solid"
      $borderColor={isLightBackground ? "hsl(0, 0%, 92.5%)" : "hsl(0, 0%, 15%)"}
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
                : "hsl(0, 0%, 15%)",
            })}
            $borderRadius="2.5rem"
            $viewport={{
              md: {
                $padding: "0.375rem 1rem",
              },
            }}
          >
            <Text
              style={{ flexShrink: 0 }}
              $size={15}
              $weight={option === selectedOption ? 600 : 400}
            >
              {t("Billed", { period: adjectify(option) })}
            </Text>
          </Flex>
        );

        if (option === "year" && savingsPercentage > 0) {
          return (
            <Tooltip
              key={option}
              trigger={element}
              content={
                <Text $size={11} $leading={1}>
                  {selectedOption === "month"
                    ? t("Save with yearly billing", {
                        percent: savingsPercentage,
                      })
                    : t("Saving with yearly billing", {
                        percent: savingsPercentage,
                      })}
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
