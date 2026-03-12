import { useMemo } from "react";

import { DEFAULT_CURRENCY } from "../const";

import { useEmbed } from "./useEmbed";

export function useAvailableCurrencies(): string[] {
  const { data } = useEmbed();

  return useMemo(() => {
    // If the company already has a subscription, lock to that currency.
    // Stripe doesn't allow mixing currencies on a subscription.
    const subscriptionCurrency = data?.subscription?.currency?.toUpperCase();
    if (subscriptionCurrency) {
      return [subscriptionCurrency];
    }

    const currencySet = new Set<string>();
    currencySet.add(DEFAULT_CURRENCY);

    const plans = [...(data?.activePlans || []), ...(data?.activeAddOns || [])];

    for (const plan of plans) {
      for (const cp of plan.currencyPrices || []) {
        currencySet.add(cp.currency.toUpperCase());
      }
    }

    return Array.from(currencySet).sort();
  }, [data?.activePlans, data?.activeAddOns, data?.subscription?.currency]);
}
