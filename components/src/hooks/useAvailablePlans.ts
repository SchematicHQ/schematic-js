import { useCallback, useMemo } from "react";

import {
  type CompanyPlanDetailResponseData,
  type ComponentHydrateResponseData,
} from "../api/checkoutexternal";
import { type PlanViewPublicResponseData } from "../api/componentspublic";
import { ChargeType } from "../utils";

import { useEmbed } from ".";

export type SelectedPlan = (
  | PlanViewPublicResponseData
  | CompanyPlanDetailResponseData
) & {
  isSelected: boolean;
};

export function useAvailablePlans(activePeriod: string) {
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
    (
      plans: (PlanViewPublicResponseData | CompanyPlanDetailResponseData)[],
    ): SelectedPlan[] => {
      const customPlanExist = plans.some((plan) => plan.custom);
      const plansWithSelected =
        settings.mode === "edit"
          ? plans.slice()
          : plans.filter(
              (plan) =>
                (activePeriod === "month" && plan.monthlyPrice) ||
                (activePeriod === "year" && plan.yearlyPrice) ||
                plan.chargeType === ChargeType.oneTime,
            );

      if (!customPlanExist) {
        plansWithSelected?.sort((a, b) => {
          if (activePeriod === "year") {
            return (a.yearlyPrice?.price ?? 0) - (b.yearlyPrice?.price ?? 0);
          }

          if (activePeriod === "month") {
            return (a.monthlyPrice?.price ?? 0) - (b.monthlyPrice?.price ?? 0);
          }

          return 0;
        });
      }

      return plansWithSelected?.map((plan) => ({ ...plan, isSelected: false }));
    },
    [activePeriod, settings.mode],
  );

  return useMemo(() => {
    return {
      plans: getActivePlans(data?.activePlans || []),
      addOns: getActivePlans(data?.activeAddOns || []),
      credits:
        (data as ComponentHydrateResponseData | undefined)?.creditBundles || [],
      periods: getAvailablePeriods(),
    };
  }, [data, getAvailablePeriods, getActivePlans]);
}
