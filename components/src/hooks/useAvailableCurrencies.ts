import { useMemo } from "react";

import { DEFAULT_CURRENCY } from "../const";

import { useEmbed } from "./useEmbed";

const sortCurrencies = (currencies: string[]): string[] =>
  [...currencies].sort((a, b) => {
    if (a === DEFAULT_CURRENCY) return -1;
    if (b === DEFAULT_CURRENCY) return 1;
    return a.localeCompare(b);
  });

/**
 * Returns the full, unfiltered set of currencies present in the hydrated
 * plan and add-on data, with DEFAULT_CURRENCY guaranteed to be included.
 */
function useHydratedCurrencies(): string[] {
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

    return sortCurrencies(Array.from(currencySet));
  }, [data?.activePlans, data?.activeAddOns]);
}

/**
 * Returns the currencies that should be displayed in the UI. When a
 * `currencyFilter` is configured on EmbedProvider, this is the intersection
 * of the filter with the hydrated currency set. Otherwise it is the full
 * hydrated set.
 */
export function useAvailableCurrencies(): string[] {
  const { currencies } = useAvailableCurrenciesWithInvalid();
  return currencies;
}

export interface AvailableCurrenciesResult {
  currencies: string[];
  invalidFilterEntries: string[];
}

/**
 * Like `useAvailableCurrencies` but also returns the list of filter entries
 * that did not match any currency in the hydrated data. Consumers can render
 * an error notice and (optionally) log these invalid inputs.
 */
export function useAvailableCurrenciesWithInvalid(): AvailableCurrenciesResult {
  const { currencyFilter, debug } = useEmbed();
  const hydrated = useHydratedCurrencies();

  return useMemo(() => {
    if (!currencyFilter || currencyFilter.length === 0) {
      return { currencies: hydrated, invalidFilterEntries: [] };
    }

    const hydratedSet = new Set(hydrated);
    const matched: string[] = [];
    const invalid: string[] = [];

    for (const entry of currencyFilter) {
      if (hydratedSet.has(entry)) {
        matched.push(entry);
      } else {
        invalid.push(entry);
      }
    }

    if (invalid.length > 0) {
      console.error(
        `[Schematic] currencyFilter contains currencies not available in the hydrated plan data: ${invalid.join(", ")}`,
      );
      debug("invalid currencyFilter entries", invalid);
    }

    return {
      currencies: sortCurrencies(matched),
      invalidFilterEntries: invalid,
    };
  }, [currencyFilter, hydrated, debug]);
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
