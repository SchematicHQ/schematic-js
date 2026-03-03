import { useMemo } from "react";

import { DEFAULT_CURRENCY } from "../const";

import { useEmbed } from "./useEmbed";

export function useAvailableCurrencies(): string[] {
  const { data } = useEmbed();

  return useMemo(() => {
    const currencySet = new Set<string>();
    currencySet.add(DEFAULT_CURRENCY);

    const plans = [...(data?.activePlans || []), ...(data?.activeAddOns || [])];

    for (const plan of plans) {
      for (const cp of plan.currencyPrices || []) {
        currencySet.add(cp.currency.toUpperCase());
      }
    }

    return Array.from(currencySet).sort();
  }, [data?.activePlans, data?.activeAddOns]);
}
