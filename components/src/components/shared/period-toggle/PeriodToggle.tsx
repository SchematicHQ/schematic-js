import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { useEmbed, useIsLightBackground } from "../../../hooks";
import type { SelectedPlan } from "../../../types";
import { adjectify, getPlanPrice } from "../../../utils";
import { Flex, Text, Tooltip } from "../../ui";

interface PeriodToggleProps {
  options: string[];
  selectedOption: string;
  selectedPlan?: SelectedPlan;
  onSelect: (period: string) => void;
}

export const PeriodToggle = ({
  options,
  selectedOption,
  selectedPlan,
  onSelect,
}: PeriodToggleProps) => {
  const { t } = useTranslation();

  const { settings } = useEmbed();

  const isLightBackground = useIsLightBackground();

  const savingsPercentage = useMemo(() => {
    if (selectedPlan) {
      const monthlyBillingPrice = getPlanPrice(selectedPlan, "month");
      const yearlyBillingPrice = getPlanPrice(selectedPlan, "year");
      const monthly = (monthlyBillingPrice?.price ?? 0) * 12;
      const yearly = yearlyBillingPrice?.price ?? 0;
      return Math.round(((monthly - yearly) / monthly) * 10000) / 100;
    }

    return 0;
  }, [selectedPlan]);

  return (
    <Flex
      $margin={0}
      $backgroundColor={settings.theme.card.background}
      $borderWidth="1px"
      $borderStyle="solid"
      $borderColor={
        isLightBackground
          ? "hsla(0, 0%, 0%, 0.125)"
          : "hsla(0, 0%, 100%, 0.125)"
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
            onClick={() => onSelect(option)}
            onKeyDown={(event: React.KeyboardEvent) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect(option);
              }
            }}
            $justifyContent="center"
            $alignItems="center"
            $flexBasis="50%"
            $whiteSpace="nowrap"
            $padding="0.75rem 1rem"
            {...(option === selectedOption && {
              $backgroundColor: isLightBackground
                ? "hsla(0, 0%, 0%, 0.125)"
                : "hsla(0, 0%, 100%, 0.125)",
            })}
            $borderRadius="2.5rem"
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
              $flexBasis="50%"
            />
          );
        }

        return element;
      })}
    </Flex>
  );
};
