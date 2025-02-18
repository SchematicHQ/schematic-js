import { useCallback, useMemo } from "react";
import type { CompanyPlanDetailResponseData } from "../api";
import { useEmbed } from ".";

export interface SelectedPlan extends CompanyPlanDetailResponseData {
  isSelected: boolean;
}

export function useAvailablePlans(activePeriod: string) {
  const { data, mode } = useEmbed();

  const getAvailablePeriods = useCallback(() => {
    const periods = [];
    if (
      data.activePlans.some((plan) => plan.monthlyPrice) ||
      data.activeAddOns.some((addOn) => addOn.monthlyPrice)
    ) {
      periods.push("month");
    }
    if (
      data.activePlans.some((plan) => plan.yearlyPrice) ||
      data.activeAddOns.some((addOn) => addOn.yearlyPrice)
    ) {
      periods.push("year");
    }

    return periods;
  }, [data.activePlans, data.activeAddOns]);

  const getActivePlans = useCallback(
    (plans: CompanyPlanDetailResponseData[]) => {
      const plansWithSelected: SelectedPlan[] = (
        mode === "edit"
          ? plans.slice()
          : plans.filter(
              (plan) =>
                (activePeriod === "month" && plan.monthlyPrice) ||
                (activePeriod === "year" && plan.yearlyPrice),
            )
      ).map((plan) => ({ ...plan, isSelected: false }));

      return plansWithSelected;
    },
    [activePeriod, mode],
  );

  return useMemo(() => {
    return {
      plans: getActivePlans(data.activePlans),
      addOns: getActivePlans(data.activeAddOns),
      periods: getAvailablePeriods(),
    };
  }, [
    data.activePlans,
    data.activeAddOns,
    getAvailablePeriods,
    getActivePlans,
  ]);
}
