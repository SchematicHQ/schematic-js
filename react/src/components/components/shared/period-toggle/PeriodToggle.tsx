import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { useEmbed, useIsLightBackground } from "../../../hooks";
import type { SelectedPlan } from "../../../types";
import { adjectify, getPlanPrice } from "../../../utils";
import { Button, Flex, Text, Tooltip } from "../../ui";

interface PeriodToggleProps {
  portal?: HTMLElement | null;
  options: string[];
  selectedOption: string;
  selectedPlan?: SelectedPlan;
  onSelect: (period: string) => void;
}

const PERIOD_MONTH_COUNT: Record<string, number> = {
  year: 12,
  quarter: 3,
};

export const PeriodToggle = ({
  portal,
  options,
  selectedOption,
  selectedPlan,
  onSelect,
}: PeriodToggleProps) => {
  const { t } = useTranslation();

  const { settings } = useEmbed();

  const isLightBackground = useIsLightBackground();

  const savingsByPeriod = useMemo(() => {
    const result: Record<string, number> = {};
    if (!selectedPlan) {
      return result;
    }

    const monthlyPrice = getPlanPrice(selectedPlan, "month")?.price ?? 0;
    if (monthlyPrice <= 0) {
      return result;
    }

    for (const [period, months] of Object.entries(PERIOD_MONTH_COUNT)) {
      const periodPrice = getPlanPrice(selectedPlan, period)?.price ?? 0;
      if (periodPrice > 0) {
        const baseline = monthlyPrice * months;
        result[period] =
          Math.round(((baseline - periodPrice) / baseline) * 10000) / 100;
      }
    }

    return result;
  }, [selectedPlan]);

  return (
    <Flex
      data-testid="sch-period-toggle"
      $alignSelf="center"
      $width="fit-content"
      $margin={0}
      $borderWidth="1px"
      $borderStyle="solid"
      $borderColor={
        isLightBackground
          ? "hsla(0, 0%, 0%, 0.125)"
          : "hsla(0, 0%, 100%, 0.125)"
      }
      $borderRadius="2.5rem"
      $cursor="pointer"
    >
      {options.map((option) => {
        const element = (
          <Button
            data-testid="sch-period-toggle-button"
            $size="sm"
            $variant="text"
            key={option}
            onClick={() => onSelect(option)}
            onKeyDown={(event: React.KeyboardEvent) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect(option);
              }
            }}
            style={{
              flexGrow: 1,
              flexBasis: "50%",
              width: "100%",
              textDecoration: "none",
              whiteSpace: "nowrap",
              borderRadius: "2.5rem",
              ...(option === selectedOption && {
                backgroundColor: isLightBackground
                  ? "hsla(0, 0%, 0%, 0.125)"
                  : "hsla(0, 0%, 100%, 0.125)",
              }),
            }}
          >
            <Text
              style={{
                flexShrink: 0,
                color: settings.theme.typography.text.color,
              }}
              $size={15}
              $weight={option === selectedOption ? 600 : 400}
            >
              {t("Billed", { period: adjectify(option) })}
            </Text>
          </Button>
        );

        const savingsPercentage = savingsByPeriod[option];
        if (typeof savingsPercentage === "number") {
          const isOptionYear = option === "year";
          return (
            <Tooltip
              key={option}
              portal={portal}
              trigger={element}
              content={
                <Text $size={11} $leading="none">
                  {selectedOption === option
                    ? t(
                        isOptionYear
                          ? "Saving with yearly billing"
                          : "Saving with quarterly billing",
                        { percent: savingsPercentage },
                      )
                    : t(
                        isOptionYear
                          ? "Save with yearly billing"
                          : "Save with quarterly billing",
                        { percent: savingsPercentage },
                      )}
                </Text>
              }
              $flexGrow={1}
              $flexBasis="50%"
            />
          );
        }

        return element;
      })}
    </Flex>
  );
};
