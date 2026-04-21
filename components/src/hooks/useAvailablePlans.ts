import { useCallback, useMemo } from "react";

import { type CompanyPlanDetailResponseData } from "../api/checkoutexternal";
import type { SelectedPlan } from "../types";
import { ChargeType } from "../utils";

import { useEmbed } from ".";

interface AvailablePlanOptions {
  useSelectedPeriod?: boolean;
  /**
   * When set, plans that don't support this currency are filtered out.
   * A plan supports a currency if it has a currency_prices row for it,
   * or (for legacy plans with no currency_prices) its primary price is
   * in that currency.
   */
  selectedCurrency?: string;
}

/**
 * Does `plan` offer pricing in `currency`? Uses currency_prices when
 * present; falls back to the legacy single-currency price fields so we
 * don't hide plans that haven't been migrated to multi-currency yet.
 *
 * Exported for unit tests.
 */
export function planSupportsCurrency(
  plan: CompanyPlanDetailResponseData,
  currency: string,
): boolean {
  const target = currency.toUpperCase();

  const currencyPrices = plan.currencyPrices ?? [];
  if (currencyPrices.length > 0) {
    return currencyPrices.some((cp) => cp.currency.toUpperCase() === target);
  }

  const legacy = (
    plan.monthlyPrice?.currency ??
    plan.yearlyPrice?.currency ??
    plan.oneTimePrice?.currency
  )?.toUpperCase();
  return legacy === target;
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
              const matchesPeriod = options.useSelectedPeriod
                ? (activePeriod === "month" && plan.monthlyPrice) ||
                  (activePeriod === "year" && plan.yearlyPrice) ||
                  plan.chargeType === ChargeType.oneTime
                : plan.monthlyPrice ||
                  plan.yearlyPrice ||
                  plan.chargeType === ChargeType.oneTime;

              if (!matchesPeriod) {
                return false;
              }

              if (options.selectedCurrency) {
                return planSupportsCurrency(plan, options.selectedCurrency);
              }

              return true;
            });

      return activePlans.map((plan) => ({ ...plan, isSelected: false }));
    },
    [
      activePeriod,
      options.useSelectedPeriod,
      options.selectedCurrency,
      settings.mode,
    ],
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
