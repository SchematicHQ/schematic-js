import { useMemo } from "react";
import { useTheme } from "styled-components";
import { type CompanyPlanDetailResponseData } from "../../../api";
import { Text } from "../../ui";

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
        $size={11}
        $weight={theme.typography.text.fontWeight}
        $color={theme.primary}
      >
        {period === "month"
          ? `Save up to ${savingsPercentage}% with yearly billing`
          : `You are saving ${savingsPercentage}% with yearly billing`}
      </Text>
    )
  );
};
