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

/**
 * Returns the currency of the company's active subscription, if any.
 * Stripe does not allow mixing currencies on a subscription, so when
 * this is set the currency selector should be locked.
 */
export function useSubscriptionCurrency(): string | undefined {
  const { data } = useEmbed();
  return data?.subscription?.currency?.toUpperCase();
}
