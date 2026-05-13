import { useCallback, useMemo } from "react";

import { type CompanyPlanDetailResponseData } from "../api/checkoutexternal";
import type { SelectedPlan } from "../types";
import { ChargeType } from "../utils";

import { useEmbed } from ".";

interface AvailablePlanOptions {
  useSelectedPeriod?: boolean;
}

export function useAvailablePlans(
  activePeriod: string,
  options: AvailablePlanOptions = { useSelectedPeriod: true },
) {
  const { data, settings } = useEmbed();

  const getAvailablePeriods = useCallback((): string[] => {
    const periods = [];
    if (
      (data?.activePlans || []).some((plan) => plan.monthlyPrice) ||
      (data?.activeAddOns || []).some((addOn) => addOn.monthlyPrice)
    ) {
      periods.push("month");
    }
    if (
      (data?.activePlans || []).some((plan) => plan.yearlyPrice) ||
      (data?.activeAddOns || []).some((addOn) => addOn.yearlyPrice)
    ) {
      periods.push("year");
    }

    return periods;
  }, [data?.activePlans, data?.activeAddOns]);

  const getActivePlans = useCallback(
    (plans: CompanyPlanDetailResponseData[]): SelectedPlan[] => {
      const activePlans =
        settings.mode === "edit"
          ? plans.slice()
          : plans.filter((plan) => {
              if (options.useSelectedPeriod) {
                return (
                  (activePeriod === "month" && plan.monthlyPrice) ||
                  (activePeriod === "year" && plan.yearlyPrice) ||
                  plan.chargeType === ChargeType.oneTime
                );
              }

              return (
                plan.monthlyPrice ||
                plan.yearlyPrice ||
                plan.chargeType === ChargeType.oneTime
              );
            });

      return activePlans.map((plan) => ({ ...plan, isSelected: false }));
    },
    [activePeriod, options.useSelectedPeriod, settings.mode],
  );

  return useMemo(() => {
    return {
      plans: getActivePlans(data?.activePlans || []),
      addOns: getActivePlans(data?.activeAddOns || []),
      periods: getAvailablePeriods(),
    };
  }, [
    data?.activePlans,
    data?.activeAddOns,
    getActivePlans,
    getAvailablePeriods,
  ]);
}
