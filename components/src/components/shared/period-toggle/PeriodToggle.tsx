import { useCallback, useMemo } from "react";
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
      const monthlyBillingPrice = getBillingPrice(selectedPlan?.monthlyPrice);
      const yearlyBillingPrice = getBillingPrice(selectedPlan?.yearlyPrice);
      const monthly = (monthlyBillingPrice?.price ?? 0) * 12;
      const yearly = yearlyBillingPrice?.price ?? 0;
      return Math.round(((monthly - yearly) / monthly) * 10000) / 100;
    }

    return 0;
  }, [selectedPlan]);

  const handleKeySelect = useCallback(
    (event: React.KeyboardEvent, option: string) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onSelect(option);
      }
    },
    [onSelect],
  );

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
            onKeyDown={(event) => handleKeySelect(event, option)}
            $justifyContent="center"
            $alignItems="center"
            $flexGrow={1}
            $whiteSpace="nowrap"
            $padding="0.75rem 1rem"
            {...(option === selectedOption && {
              $backgroundColor: isLightBackground
                ? "hsla(0, 0%, 0%, 0.125)"
                : "hsla(0, 0%, 100%, 0.125)",
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
              $flexGrow={1}
            />
          );
        }

        return element;
      })}
    </Flex>
  );
};
