import { useMemo } from "react";

import { DEFAULT_CURRENCY } from "../const";

import { useEmbed } from "./useEmbed";

/**
 * Returns the full, unfiltered set of currencies present in the hydrated
 * plan and add-on data. The first plan's `currencyPrices` is used to derive
 * the sort order. Any non-overlapping currencies beyond that are sorted
 * alphabetically.
 */
function useHydratedCurrencies(): string[] {
  const { data } = useEmbed();

  return useMemo(() => {
    const ordered: string[] = [];
    const seen = new Set<string>();

    const push = (currency?: string | null) => {
      if (!currency) return;
      const code = currency.toUpperCase();
      if (seen.has(code)) return;
      seen.add(code);
      ordered.push(code);
    };

    // Prefix: first plan's stored currency order wins. Position 0 of its
    // `currencyPrices` is the plan's default; we want that to be the toggle's
    // default too.
    const firstPlan = data?.activePlans?.[0];
    if (firstPlan) {
      const prices = firstPlan.currencyPrices ?? [];
      if (prices.length > 0) {
        for (const cp of prices) {
          push(cp.currency);
        }
      } else {
        // Legacy single-currency plan: still seeds the prefix so the toggle
        // default reflects the first plan.
        push(firstPlan.monthlyPrice?.currency);
        push(firstPlan.yearlyPrice?.currency);
        push(firstPlan.oneTimePrice?.currency);
      }
    }

    // Tail: every other currency across remaining plans + add-ons,
    // alphabetized. Currencies already in the prefix are dropped via `seen`.
    const leftover = new Set<string>();
    const rest = [
      ...(data?.activePlans ?? []).slice(1),
      ...(data?.activeAddOns ?? []),
    ];
    for (const plan of rest) {
      for (const cp of plan.currencyPrices ?? []) {
        const code = cp.currency.toUpperCase();
        if (!seen.has(code)) leftover.add(code);
      }
    }
    [...leftover].sort().forEach((c) => push(c));

    if (ordered.length === 0) {
      ordered.push(DEFAULT_CURRENCY);
    }

    return ordered;
  }, [data?.activePlans, data?.activeAddOns]);
}

/**
 * Returns the currencies that should be displayed in the UI. When a
 * `currencyFilter` is configured on SchematicProvider, this is the intersection
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

    // Walk the filter in user-input order so the toggle reflects the order
    // the integrator configured rather than alphabetizing it back. Normalize
    // each entry to uppercase before lookup — currency codes round-trip
    // through the API as lowercase (the DB stores them that way), and while
    // SchematicProvider already uppercases the filter at its boundary, doing it
    // here too keeps the hook self-contained.
    for (const entry of currencyFilter) {
      const code = entry.toUpperCase();
      if (hydratedSet.has(code)) {
        matched.push(code);
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
      currencies: matched,
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
