import { useCallback, useMemo } from "react";

import { type CompanyPlanDetailResponseData } from "../api/checkoutexternal";
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

  const getAvailablePeriods = useCallback<() => string[]>(() => {
    const periods: string[] = [];

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

  const getAvailablePlans = useCallback<
    (plans?: CompanyPlanDetailResponseData[]) => CompanyPlanDetailResponseData[]
  >(
    (plans = []) => {
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

  const availablePeriods = useMemo<string[]>(() => {
    return getAvailablePeriods();
  }, [getAvailablePeriods]);

  const availablePlans = useMemo<CompanyPlanDetailResponseData[]>(() => {
    return getAvailablePlans(data?.activePlans);
  }, [getAvailablePlans, data?.activePlans]);

  const availableAddOns = useMemo<CompanyPlanDetailResponseData[]>(() => {
    return getAvailablePlans(data?.activeAddOns);
  }, [getAvailablePlans, data?.activeAddOns]);

  return {
    plans: availablePlans,
    addOns: availableAddOns,
    periods: availablePeriods,
  };
}
