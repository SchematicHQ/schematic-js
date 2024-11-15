import { useMemo } from "react";
import { useTheme } from "styled-components";
import { type CompanyPlanDetailResponseData } from "../../../api";
import { Text, Tooltip } from "../../ui";

interface SavingsProps {
  plan?: CompanyPlanDetailResponseData;
  period: string;
}

export const Savings = ({ plan, period }: SavingsProps) => {
  const theme = useTheme();

  const savingsPercentage = useMemo(() => {
    if (plan) {
      const monthly = (plan?.monthlyPrice?.price || 0) * 12;
      const yearly = plan?.yearlyPrice?.price || 0;
      return Math.round(((monthly - yearly) / monthly) * 10000) / 100;
    }

    return 0;
  }, [plan]);

  return (
    savingsPercentage > 0 && (
      <Text
        $font={theme.typography.text.fontFamily}
        $size={14}
        $weight={theme.typography.text.fontWeight}
        $color={theme.typography.text.color}
        style={{
          whiteSpace: "nowrap",
        }}
      >
        <Tooltip
          label="Billed yearly"
          position="right"
          description={
            period === "month"
              ? `Save up to ${savingsPercentage}%`
              : `You are saving ${savingsPercentage}%`
          }
        />
      </Text>
    )
  );
};
