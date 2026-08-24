import {
  type CatalogCurrencyPricesResponseData,
  type CatalogPriceResponseData,
  type CatalogPriceTierResponseData,
} from "../api/public";

import { formatCurrency, type FormatOptions } from "./format";
import { pricePeriod, PricePeriod } from "./period";

/** Display order for period toggles. */
export const PERIOD_ORDER: PricePeriod[] = [
  PricePeriod.Month,
  PricePeriod.Quarter,
  PricePeriod.Year,
  PricePeriod.OneTime,
];

/** Months covered by one billing period, for monthly-equivalent math. */
export const MONTHS_PER_PERIOD: Partial<Record<PricePeriod, number>> = {
  [PricePeriod.Month]: 1,
  [PricePeriod.Quarter]: 3,
  [PricePeriod.Year]: 12,
};

export interface PricedEntity {
  currencyPrices: CatalogCurrencyPricesResponseData[];
  monthlyPrice?: CatalogPriceResponseData;
  oneTimePrice?: CatalogPriceResponseData;
  quarterlyPrice?: CatalogPriceResponseData;
  yearlyPrice?: CatalogPriceResponseData;
}

const slotFor = (
  entity: PricedEntity | CatalogCurrencyPricesResponseData,
  period: PricePeriod,
): CatalogPriceResponseData | undefined => {
  switch (period) {
    case PricePeriod.Month:
      return entity.monthlyPrice;
    case PricePeriod.Quarter:
      return entity.quarterlyPrice;
    case PricePeriod.Year:
      return entity.yearlyPrice;
    case PricePeriod.OneTime:
      return entity.oneTimePrice;
    default:
      return undefined;
  }
};

/**
 * Resolves an entity's price for a period, preferring an exact currency
 * match from currency_prices and falling back to the top-level slots (which
 * carry the default currency).
 */
export const resolvePrice = (
  entity: PricedEntity,
  period: PricePeriod,
  currency?: string,
): CatalogPriceResponseData | undefined => {
  if (currency !== undefined) {
    const match = entity.currencyPrices.find(
      (cp) => cp.currency.toLowerCase() === currency.toLowerCase(),
    );
    const price = match !== undefined ? slotFor(match, period) : undefined;
    if (price !== undefined) {
      return price;
    }
    const fallback = slotFor(entity, period);
    if (
      fallback !== undefined &&
      fallback.currency.toLowerCase() !== currency.toLowerCase()
    ) {
      return undefined;
    }
    return fallback;
  }
  return slotFor(entity, period);
};

/**
 * A price's numeric value in minor units, preferring the decimal string
 * (sub-cent precision) over the integer amount.
 */
export const priceValue = (price: CatalogPriceResponseData): number => {
  if (price.priceDecimal !== undefined && price.priceDecimal !== null) {
    const parsed = Number(price.priceDecimal);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return price.price;
};

export interface PriceTier {
  flatPrice?: number;
  formattedFlatPrice?: string;
  formattedPerUnitPrice?: string;
  from: number;
  perUnitPrice?: number;
  /** Undefined = unbounded tier. */
  to?: number;
}

export interface PriceDisplay {
  amount: number;
  currency: string;
  formatted: string;
  /**
   * The per-month equivalent of a quarterly/yearly price, present when the
   * catalog's show_as_monthly_prices display setting is on.
   */
  monthlyEquivalent?: { amount: number; formatted: string };
  /** Units covered per priced package when larger than one. */
  packageSize?: number;
  period: PricePeriod;
  tiers?: PriceTier[];
  tiersMode?: string;
}

export const derivePriceDisplay = (
  price: CatalogPriceResponseData,
  options?: FormatOptions & { showAsMonthlyPrices?: boolean },
): PriceDisplay => {
  const amount = priceValue(price);
  const period = pricePeriod(price);
  const display: PriceDisplay = {
    amount,
    currency: price.currency,
    formatted: formatCurrency(amount, price.currency, options),
    period,
  };
  if (price.packageSize > 1) {
    display.packageSize = price.packageSize;
  }
  const months = MONTHS_PER_PERIOD[period];
  if (
    options?.showAsMonthlyPrices === true &&
    months !== undefined &&
    months > 1
  ) {
    const monthly = amount / months;
    display.monthlyEquivalent = {
      amount: monthly,
      formatted: formatCurrency(monthly, price.currency, options),
    };
  }
  if (price.priceTiers.length > 0) {
    display.tiers = price.priceTiers.map((tier) =>
      buildPriceTier(tier, price.currency, options),
    );
    if (price.tiersMode !== undefined && price.tiersMode !== null) {
      display.tiersMode = price.tiersMode;
    }
  }
  return display;
};

const buildPriceTier = (
  tier: CatalogPriceTierResponseData,
  currency: string,
  options?: FormatOptions,
): PriceTier => {
  const vm: PriceTier = { from: tier.from };
  if (tier.to !== undefined && tier.to !== null) {
    vm.to = tier.to;
  }
  if (tier.perUnitPrice !== undefined && tier.perUnitPrice !== null) {
    vm.perUnitPrice = tier.perUnitPrice;
  }
  const perUnit =
    tier.perUnitPriceDecimal !== undefined && tier.perUnitPriceDecimal !== null
      ? Number(tier.perUnitPriceDecimal)
      : tier.perUnitPrice;
  if (perUnit !== undefined && perUnit !== null && !Number.isNaN(perUnit)) {
    vm.formattedPerUnitPrice = formatCurrency(perUnit, currency, options);
  }
  if (tier.flatPrice !== undefined && tier.flatPrice !== null) {
    vm.flatPrice = tier.flatPrice;
    vm.formattedFlatPrice = formatCurrency(tier.flatPrice, currency, options);
  }
  return vm;
};
