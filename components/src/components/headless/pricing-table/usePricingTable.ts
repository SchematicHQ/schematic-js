import { useMemo, useState } from "react";

export interface UsePricingTableProps {
  /**
   * The billing periods available to choose from (e.g. `["month", "year"]`).
   * A period toggle is only meaningful when more than one is offered.
   */
  periods?: string[];
  /** Controlled selected period. Pair with `onPeriodChange`. */
  period?: string;
  /**
   * Initial period when uncontrolled. Defaults to the first entry of `periods`,
   * falling back to `"month"`.
   */
  defaultPeriod?: string;
  /** Called whenever the selected period changes (controlled or not). */
  onPeriodChange?: (period: string) => void;
  /**
   * The currency codes available to choose from (e.g. `["usd", "eur"]`). A
   * currency toggle is only meaningful when more than one is offered.
   */
  currencies?: string[];
  /** Controlled selected currency. Pair with `onCurrencyChange`. */
  currency?: string;
  /** Initial currency when uncontrolled. Defaults to the first `currencies` entry. */
  defaultCurrency?: string;
  /** Called whenever the selected currency changes (controlled or not). */
  onCurrencyChange?: (currency: string) => void;
}

type PropGetter = () => React.HTMLAttributes<HTMLElement> &
  Record<string, unknown>;

/** Options for a toggle button that selects one value from a set. */
type OptionPropGetter = (
  value: string,
) => React.ButtonHTMLAttributes<HTMLButtonElement> & Record<string, unknown>;

export interface PricingTableApi {
  /** The billing periods available to choose from. */
  periods: string[];
  /** The currently selected billing period. */
  selectedPeriod: string;
  /** Select a billing period (no-op when it is not in `periods`). */
  setSelectedPeriod: (period: string) => void;
  /** Whether a period toggle is worth showing (more than one period). */
  showPeriodToggle: boolean;
  /** The currency codes available to choose from. */
  currencies: string[];
  /** The currently selected currency (empty string when none are offered). */
  selectedCurrency: string;
  /** Select a currency (no-op when it is not in `currencies`). */
  setSelectedCurrency: (currency: string) => void;
  /** Whether a currency toggle is worth showing (more than one currency). */
  showCurrencyToggle: boolean;
  getRootProps: PropGetter;
  getLabelProps: PropGetter;
  getSectionProps: PropGetter;
  /** Props for a card. Pass `{ active: true }` for the company's current plan. */
  getCardProps: (opts?: {
    active?: boolean;
  }) => React.HTMLAttributes<HTMLElement> & Record<string, unknown>;
  getNameProps: PropGetter;
  getDescriptionProps: PropGetter;
  getPriceProps: PropGetter;
  getEntitlementsProps: PropGetter;
  getEntitlementProps: PropGetter;
  getFooterProps: PropGetter;
  /** Props for a card's call-to-action button. */
  getCallToActionProps: (opts?: {
    active?: boolean;
    disabled?: boolean;
  }) => React.ButtonHTMLAttributes<HTMLButtonElement> & Record<string, unknown>;
  getPeriodToggleProps: PropGetter;
  /** Props for a single period option button; `value` is that option's period. */
  getPeriodOptionProps: OptionPropGetter;
  getCurrencyToggleProps: PropGetter;
  /** Props for a single currency option button; `value` is that option's currency. */
  getCurrencyOptionProps: OptionPropGetter;
}

/**
 * Headless logic for a pricing table. Pure and controlled — it fetches nothing.
 * The caller supplies the available `periods`/`currencies` (typically derived
 * from `useAvailablePlans` / `useAvailableCurrencies`) and the plan data it maps
 * over; the hook owns only the interactive period/currency selection and hands
 * back prop-getters to spread onto the caller's own markup, or lets the
 * `PricingTable.*` compound components do it.
 *
 * Selection is controllable: pass `period`/`currency` (+ the matching
 * `onChange`) to drive it yourself, or omit them to let the hook manage state
 * seeded by `defaultPeriod`/`defaultCurrency`.
 */
export function usePricingTable({
  periods = [],
  period,
  defaultPeriod,
  onPeriodChange,
  currencies = [],
  currency,
  defaultCurrency,
  onCurrencyChange,
}: UsePricingTableProps = {}): PricingTableApi {
  const [internalPeriod, setInternalPeriod] = useState(
    () => defaultPeriod ?? periods[0] ?? "month",
  );
  const [internalCurrency, setInternalCurrency] = useState(
    () => defaultCurrency ?? currencies[0] ?? "",
  );

  const periodIsControlled = period !== undefined;
  const currencyIsControlled = currency !== undefined;

  let selectedPeriod = periodIsControlled ? period : internalPeriod;
  let selectedCurrency = currencyIsControlled ? currency : internalCurrency;

  // Snap the uncontrolled selection back to a valid option when the available
  // set changes and the current choice is no longer offered. Done during render
  // (not in an effect) to avoid a flash of the stale value; the guard converges
  // because the next value is always a member of the list.
  if (
    !periodIsControlled &&
    periods.length > 0 &&
    !periods.includes(selectedPeriod)
  ) {
    selectedPeriod = periods[0];
    setInternalPeriod(periods[0]);
  }
  if (
    !currencyIsControlled &&
    currencies.length > 0 &&
    !currencies.includes(selectedCurrency)
  ) {
    selectedCurrency = currencies[0];
    setInternalCurrency(currencies[0]);
  }

  return useMemo<PricingTableApi>(() => {
    const showPeriodToggle = periods.length > 1;
    const showCurrencyToggle = currencies.length > 1;

    const setSelectedPeriod = (next: string) => {
      if (!periodIsControlled) {
        setInternalPeriod(next);
      }
      onPeriodChange?.(next);
    };

    const setSelectedCurrency = (next: string) => {
      if (!currencyIsControlled) {
        setInternalCurrency(next);
      }
      onCurrencyChange?.(next);
    };

    return {
      periods,
      selectedPeriod,
      setSelectedPeriod,
      showPeriodToggle,
      currencies,
      selectedCurrency,
      setSelectedCurrency,
      showCurrencyToggle,
      getRootProps: () => ({
        "data-schematic": "pricing-table",
        "data-part": "root",
        "data-period": selectedPeriod,
        ...(selectedCurrency ? { "data-currency": selectedCurrency } : {}),
      }),
      getLabelProps: () => ({
        "data-schematic": "pricing-table-label",
        "data-part": "label",
      }),
      getSectionProps: () => ({
        "data-schematic": "pricing-table-section",
        "data-part": "section",
      }),
      getCardProps: ({ active = false } = {}) => ({
        "data-schematic": "pricing-table-card",
        "data-part": "card",
        ...(active
          ? { "data-active": "true", "aria-current": "true" as const }
          : {}),
      }),
      getNameProps: () => ({
        "data-schematic": "pricing-table-name",
        "data-part": "name",
      }),
      getDescriptionProps: () => ({
        "data-schematic": "pricing-table-description",
        "data-part": "description",
      }),
      getPriceProps: () => ({
        "data-schematic": "pricing-table-price",
        "data-part": "price",
      }),
      getEntitlementsProps: () => ({
        "data-schematic": "pricing-table-entitlements",
        "data-part": "entitlements",
      }),
      getEntitlementProps: () => ({
        "data-schematic": "pricing-table-entitlement",
        "data-part": "entitlement",
      }),
      getFooterProps: () => ({
        "data-schematic": "pricing-table-footer",
        "data-part": "footer",
      }),
      getCallToActionProps: ({ active = false, disabled = false } = {}) => ({
        "type": "button",
        "data-schematic": "pricing-table-call-to-action",
        "data-part": "call-to-action",
        ...(active ? { "data-active": "true" } : {}),
        ...(disabled ? { disabled: true } : {}),
      }),
      getPeriodToggleProps: () => ({
        "role": "radiogroup",
        "aria-label": "Billing period",
        "data-schematic": "pricing-table-period-toggle",
        "data-part": "period-toggle",
      }),
      getPeriodOptionProps: (value) => {
        const isSelected = value === selectedPeriod;
        return {
          "type": "button",
          "role": "radio",
          "aria-checked": isSelected,
          "data-schematic": "pricing-table-period-option",
          "data-part": "period-option",
          "data-value": value,
          ...(isSelected ? { "data-selected": "true" } : {}),
          "onClick": () => setSelectedPeriod(value),
        };
      },
      getCurrencyToggleProps: () => ({
        "role": "radiogroup",
        "aria-label": "Currency",
        "data-schematic": "pricing-table-currency-toggle",
        "data-part": "currency-toggle",
      }),
      getCurrencyOptionProps: (value) => {
        const isSelected = value === selectedCurrency;
        return {
          "type": "button",
          "role": "radio",
          "aria-checked": isSelected,
          "data-schematic": "pricing-table-currency-option",
          "data-part": "currency-option",
          "data-value": value,
          ...(isSelected ? { "data-selected": "true" } : {}),
          "onClick": () => setSelectedCurrency(value),
        };
      },
    };
  }, [
    periods,
    currencies,
    selectedPeriod,
    selectedCurrency,
    periodIsControlled,
    currencyIsControlled,
    onPeriodChange,
    onCurrencyChange,
    setInternalPeriod,
    setInternalCurrency,
  ]);
}
