import type {
  EntitlementDisplay,
  EntitlementMetricPeriod,
  FeatureRef,
  FeatureUsageRow,
  PriceTier,
  TiersMode,
} from "@schematichq/schematic-react";

import {
  featureName,
  formatConsumptionRate,
  formatCurrency,
  formatDate,
  formatNumber,
  formatShortDate,
} from "./format";
import { PERIOD_SHORT, PERIOD_WORD, type PricePeriod } from "./period";
import {
  findPrice,
  isTiered,
  overageTier,
  priceAmount,
  tierFor,
  tierUnitAmount,
  tieredCost,
} from "./prices";

/**
 * Entitlement and usage derivations: the display decision trees reduced to
 * structured parts. Numerals are formatted for the locale; sentences are the
 * element's job.
 */

const METRIC_PERIOD_WORD: Record<EntitlementMetricPeriod, string | null> = {
  all_time: null,
  billing: "billing period",
  current_day: "day",
  current_month: "month",
  current_week: "week",
  current_year: "year",
};

/** The period word of an event feature's metric period ("month"), else null. */
export function metricPeriodWord(
  entitlement: Pick<EntitlementDisplay, "feature" | "metricPeriod">,
): string | null {
  if (
    entitlement.feature.type !== "event" ||
    entitlement.metricPeriod === null
  ) {
    return null;
  }
  return METRIC_PERIOD_WORD[entitlement.metricPeriod];
}

/** A formatted price per unit (or per package of units). */
export interface UnitPrice {
  /** "$0.02" */
  priceText: string;
  /** Units covered by `priceText`; > 1 for packaged prices. */
  packageSize: number;
  /** "1,000" when packaged, else null. */
  packageText: string | null;
  /** Feature name pluralised for the package size. */
  unit: string;
  /** Period the price recurs per, for pay-in-advance and trait pricing. */
  period: PricePeriod | null;
  /** "mo" / "yr" for the period, else null. */
  periodShort: string | null;
}

export interface TierSummary {
  rows: {
    from: number;
    to: number | null;
    fromText: string;
    toText: string | null;
    unitPriceText: string;
    flatText: string | null;
  }[];
  mode: TiersMode | null;
}

export type EntitlementValue =
  /** A feature that is simply on. Render the feature name. */
  | { kind: "boolean"; unit: string }
  /** "1,000 API calls per month" */
  | {
      kind: "numeric";
      quantity: number;
      quantityText: string;
      unit: string;
      periodWord: string | null;
    }
  /** "Unlimited API calls" */
  | { kind: "unlimited"; unit: string }
  /** A trait entitlement; the value is not displayed. */
  | { kind: "trait"; unit: string }
  /** "$5.00 per seat per month" (pay in advance) / "$0.01 per API call" (pay as you go) */
  | { kind: "priced"; price: UnitPrice; perPeriod: boolean }
  /** "Up to 1,000 API calls at $0.01 per call" — first band of a tiered price. */
  | {
      kind: "tiered";
      firstTier: {
        to: number | null;
        toText: string | null;
        unitPriceText: string;
        flatText: string | null;
      };
      unit: string;
      periodWord: string | null;
    }
  /** "2 credits per image generation" */
  | { kind: "credit_rate"; rateText: string; creditUnit: string; unit: string }
  /** "Up to 200 messages per month" (credit-burndown, credits hidden) */
  | {
      kind: "credit_limit";
      quantityText: string;
      unit: string;
      periodWord: string | null;
    }
  /** Metered, but not priced for the selected period/currency. */
  | { kind: "unavailable"; unit: string };

export interface EntitlementSummary {
  feature: FeatureRef;
  /** Icon name or emoji; null when none. */
  icon: string | null;
  description: string | null;
  value: EntitlementValue;
  /** "then $0.02 per API call" for overage pricing. */
  overage: UnitPrice | null;
  /** Tier table for a tooltip, when the price is tiered. */
  tiers: TierSummary | null;
  /** The hard limit to disclose, when the consumer shows hard limits. */
  hardLimit: number | null;
}

export interface EntitlementOptions {
  period: PricePeriod;
  currency: string;
  locale: string;
  /** Show credit facts (consumption rate) rather than the credit-equivalent limit. Default true. */
  showCredits?: boolean;
  /** Disclose hard limits on priced entitlements. Default false. */
  showHardLimit?: boolean;
  /** Show the warning threshold as the advertised limit. Default false. */
  showWarningThresholdAsLimit?: boolean;
}

export function unitPrice(
  amountMinor: number,
  currency: string,
  packageSize: number,
  feature: FeatureRef,
  period: PricePeriod | null,
  locale: string,
): UnitPrice {
  return {
    priceText: formatCurrency(amountMinor, currency, locale),
    packageSize,
    packageText: packageSize > 1 ? formatNumber(packageSize, locale) : null,
    unit: featureName(feature, packageSize),
    period,
    periodShort: period === null ? null : PERIOD_SHORT[period],
  };
}

export function tierSummary(
  tiers: PriceTier[],
  mode: TiersMode | null,
  currency: string,
  locale: string,
): TierSummary | null {
  if (tiers.length === 0) {
    return null;
  }
  return {
    rows: tiers.map((tier) => ({
      from: tier.from,
      to: tier.to,
      fromText: formatNumber(tier.from, locale),
      toText: tier.to === null ? null : formatNumber(tier.to, locale),
      unitPriceText: formatCurrency(tierUnitAmount(tier), currency, locale),
      flatText:
        tier.flatAmount === null || tier.flatAmount === 0
          ? null
          : formatCurrency(tier.flatAmount, currency, locale),
    })),
    mode,
  };
}

/** The advertised limit: the warning threshold when asked for, else the entitlement's own. */
function advertisedLimit(
  entitlement: EntitlementDisplay,
  showWarningThresholdAsLimit: boolean,
): number | null {
  if (showWarningThresholdAsLimit && entitlement.warningThreshold !== null) {
    return entitlement.warningThreshold;
  }
  if (entitlement.priceBehavior === "overage") {
    return entitlement.softLimit;
  }
  return entitlement.valueNumeric;
}

/** A plan entitlement as a pricing-table row. */
export function deriveEntitlement(
  entitlement: EntitlementDisplay,
  options: EntitlementOptions,
): EntitlementSummary {
  const {
    currency,
    locale,
    period,
    showCredits = true,
    showHardLimit = false,
    showWarningThresholdAsLimit = false,
  } = options;
  const { feature, priceBehavior } = entitlement;
  const price = findPrice(entitlement.meteredPrices, period, currency);
  const tiered = price !== undefined && isTiered(price);
  const periodWord = metricPeriodWord(entitlement);
  const limit = advertisedLimit(entitlement, showWarningThresholdAsLimit);
  const plural = featureName(feature);
  // Boolean features read as their own name ("SSO"), never pluralised.
  const bare = feature.name;

  let value: EntitlementValue;
  if (priceBehavior === null) {
    switch (entitlement.valueType) {
      case "unlimited":
        value = { kind: "unlimited", unit: plural };
        break;
      case "numeric":
        value =
          limit === null
            ? { kind: "boolean", unit: bare }
            : {
                kind: "numeric",
                quantity: limit,
                quantityText: formatNumber(limit, locale),
                unit: featureName(feature, limit),
                periodWord,
              };
        break;
      case "trait":
        value = { kind: "trait", unit: plural };
        break;
      default:
        value = { kind: "boolean", unit: bare };
    }
  } else if (priceBehavior === "credit_burndown") {
    const credit = entitlement.credit;
    if (showCredits && credit !== null) {
      value = {
        kind: "credit_rate",
        rateText: formatConsumptionRate(credit.consumptionRate, locale),
        creditUnit: featureName(credit, credit.consumptionRate),
        unit: featureName(feature, 1),
      };
    } else if (credit !== null && credit.equivalentLimit !== null) {
      value = {
        kind: "credit_limit",
        quantityText: formatNumber(credit.equivalentLimit, locale),
        unit: featureName(feature, credit.equivalentLimit),
        periodWord,
      };
    } else {
      value = { kind: "boolean", unit: bare };
    }
  } else if (priceBehavior === "overage") {
    value =
      limit === null
        ? { kind: "boolean", unit: bare }
        : {
            kind: "numeric",
            quantity: limit,
            quantityText: formatNumber(limit, locale),
            unit: featureName(feature, limit),
            periodWord,
          };
  } else if (price === undefined) {
    value = { kind: "unavailable", unit: plural };
  } else if (priceBehavior === "tier" || tiered) {
    const first = price.tiers[0];
    value = {
      kind: "tiered",
      firstTier: {
        to: first?.to ?? null,
        toText:
          first?.to === null || first === undefined
            ? null
            : formatNumber(first.to, locale),
        unitPriceText: formatCurrency(
          first === undefined ? 0 : tierUnitAmount(first),
          currency,
          locale,
        ),
        flatText:
          first === undefined ||
          first.flatAmount === null ||
          first.flatAmount === 0
            ? null
            : formatCurrency(first.flatAmount, currency, locale),
      },
      unit: plural,
      periodWord: PERIOD_WORD[period],
    };
  } else {
    value = {
      kind: "priced",
      price: unitPrice(
        priceAmount(price),
        price.currency,
        price.packageSize,
        feature,
        priceBehavior === "pay_in_advance" ? period : null,
        locale,
      ),
      perPeriod: priceBehavior === "pay_in_advance",
    };
  }

  let overage: UnitPrice | null = null;
  if (priceBehavior === "overage" && price !== undefined) {
    const band = overageTier(price);
    const amount =
      band === undefined ? priceAmount(price) : tierUnitAmount(band);
    overage = unitPrice(
      amount,
      price.currency,
      price.packageSize,
      feature,
      feature.type === "trait" ? period : null,
      locale,
    );
  }

  return {
    feature,
    icon: feature.icon,
    description: feature.description,
    value,
    overage,
    tiers:
      price !== undefined && (priceBehavior === "tier" || tiered)
        ? tierSummary(price.tiers, price.tiersMode, price.currency, locale)
        : null,
    hardLimit:
      showHardLimit &&
      priceBehavior !== null &&
      priceBehavior !== "credit_burndown" &&
      entitlement.valueType === "numeric"
        ? entitlement.valueNumeric
        : null,
  };
}

export type UsageState = "ok" | "over" | "warning";

export type UsageAllocation =
  /** "1,000 API calls" — the included quantity. */
  | { kind: "limit"; quantity: number; quantityText: string; unit: string }
  /** "$0.01 per API call" — pay as you go. */
  | { kind: "priced_unit"; price: UnitPrice }
  /** "Up to 5,000 in this tier" / "Unlimited in this tier". */
  | { kind: "tier"; to: number | null; toText: string | null; unit: string }
  /** "2 credits per use". */
  | { kind: "credit_rate"; rateText: string; creditUnit: string }
  /** "200 messages remaining" — credit-burndown with credits hidden. */
  | { kind: "credit_limit"; quantityText: string; unit: string }
  /** "Unlimited API calls". */
  | { kind: "unlimited"; unit: string }
  /** Nothing to say (boolean features). */
  | { kind: "none" };

export interface UsageSummary {
  feature: FeatureRef;
  icon: string | null;
  description: string | null;
  /** Event and trait features carry usage; boolean features do not. */
  isMetered: boolean;
  /** Whether the company currently has access. */
  access: boolean;
  allocation: UsageAllocation;
  usage: {
    used: number;
    usedText: string;
    unit: string;
    limit: number | null;
    limitText: string | null;
    /** 0–100+, null when unlimited. */
    percent: number | null;
    state: UsageState;
  };
  /** Cost accrued so far this period. */
  cost: { text: string; periodShort: string | null } | null;
  /** The recurring unit price (pay in advance) or overage rate (overage). */
  unitPrice: UnitPrice | null;
  /** Units above the soft limit, for overage. */
  overageUnits: { quantity: number; quantityText: string; unit: string } | null;
  tiers: TierSummary | null;
  resetsAt: { date: Date; text: string } | null;
  expiresAt: { date: Date; text: string } | null;
  /** Whether a meter makes sense (not pay-as-you-go or credit-burndown). */
  showMeter: boolean;
  /** Pay-in-advance entitlements can buy more units. */
  canAddMore: boolean;
  hardLimit: number | null;
}

export interface UsageOptions {
  /** The subscription's period; prices are selected for it. */
  period: PricePeriod | null;
  /** The subscription's currency. */
  currency: string | null;
  locale: string;
  showCredits?: boolean;
  showHardLimit?: boolean;
  showWarningThresholdAsLimit?: boolean;
  /**
   * Percent of the limit at which the meter warns. A consumer value wins;
   * otherwise the server's warning threshold; otherwise 90.
   */
  warningPercent?: number;
}

export const DEFAULT_WARNING_PERCENT = 90;

/** A company's usage row as a feature-usage summary. */
export function deriveUsage(
  row: FeatureUsageRow,
  options: UsageOptions,
): UsageSummary {
  const {
    currency,
    locale,
    period,
    showCredits = true,
    showHardLimit = false,
    showWarningThresholdAsLimit = false,
    warningPercent,
  } = options;
  const { feature, priceBehavior } = row;
  const isMetered = feature.type === "event" || feature.type === "trait";
  const price =
    period === null || currency === null
      ? undefined
      : findPrice(row.meteredPrices, period, currency);
  const tiered = price !== undefined && isTiered(price);

  const limit =
    showWarningThresholdAsLimit && row.warningThreshold !== null
      ? row.warningThreshold
      : priceBehavior === "overage"
        ? row.softLimit
        : priceBehavior === "credit_burndown"
          ? (row.credit?.equivalentLimit ?? row.effectiveLimit)
          : row.effectiveLimit;

  let allocation: UsageAllocation = { kind: "none" };
  if (isMetered) {
    if (priceBehavior === "tier" && price !== undefined) {
      const band = tierFor(price.tiers, row.usage);
      allocation = {
        kind: "tier",
        to: band?.to ?? null,
        toText:
          band?.to === null || band === undefined
            ? null
            : formatNumber(band.to, locale),
        unit: featureName(feature),
      };
    } else if (priceBehavior === "pay_as_you_go" && price !== undefined) {
      allocation = {
        kind: "priced_unit",
        price: unitPrice(
          priceAmount(price),
          price.currency,
          price.packageSize,
          feature,
          null,
          locale,
        ),
      };
    } else if (
      priceBehavior === "credit_burndown" &&
      row.credit !== null &&
      showCredits
    ) {
      allocation = {
        kind: "credit_rate",
        rateText: formatConsumptionRate(row.credit.consumptionRate, locale),
        creditUnit: featureName(row.credit, row.credit.consumptionRate),
      };
    } else if (priceBehavior === "credit_burndown" && limit !== null) {
      allocation = {
        kind: "credit_limit",
        quantityText: formatNumber(Math.max(0, limit - row.usage), locale),
        unit: featureName(feature, limit),
      };
    } else if (limit !== null) {
      allocation = {
        kind: "limit",
        quantity: limit,
        quantityText: formatNumber(limit, locale),
        unit: featureName(feature, limit),
      };
    } else if (priceBehavior === null && row.valueType === "unlimited") {
      allocation = { kind: "unlimited", unit: featureName(feature) };
    }
  }

  const percent =
    limit === null || limit <= 0 ? null : (row.usage / limit) * 100;
  const threshold =
    warningPercent ??
    (row.warningThreshold !== null && limit !== null && limit > 0
      ? (row.warningThreshold / limit) * 100
      : DEFAULT_WARNING_PERCENT);
  const state: UsageState =
    limit !== null && row.usage > limit
      ? "over"
      : percent !== null && percent >= threshold
        ? "warning"
        : "ok";

  let unitPriceSummary: UnitPrice | null = null;
  if (price !== undefined && priceBehavior === "pay_in_advance" && !tiered) {
    unitPriceSummary = unitPrice(
      priceAmount(price),
      price.currency,
      price.packageSize,
      feature,
      period,
      locale,
    );
  } else if (price !== undefined && priceBehavior === "overage") {
    const band = overageTier(price);
    unitPriceSummary = unitPrice(
      band === undefined ? priceAmount(price) : tierUnitAmount(band),
      price.currency,
      price.packageSize,
      feature,
      feature.type === "trait" ? period : null,
      locale,
    );
  }

  const overageQuantity =
    priceBehavior === "overage" && row.softLimit !== null
      ? Math.max(0, row.usage - row.softLimit)
      : null;

  let cost: UsageSummary["cost"] = null;
  if (
    row.currentCost !== null &&
    row.currentCost > 0 &&
    row.currentCostCurrency !== null
  ) {
    cost = {
      text: formatCurrency(row.currentCost, row.currentCostCurrency, locale),
      periodShort:
        feature.type === "trait" && period !== null
          ? PERIOD_SHORT[period]
          : null,
    };
  } else if (
    price !== undefined &&
    priceBehavior === "pay_in_advance" &&
    row.effectiveLimit !== null &&
    row.effectiveLimit > 0
  ) {
    // Pay-in-advance cost is the committed quantity × unit price: a fact of
    // the subscription rather than of usage, so it is derived here.
    const amount = tiered
      ? tieredCost(row.effectiveLimit, price.tiers, price.tiersMode)
      : (row.effectiveLimit / price.packageSize) * priceAmount(price);
    cost = {
      text: formatCurrency(amount, price.currency, locale),
      periodShort: period === null ? null : PERIOD_SHORT[period],
    };
  }

  return {
    feature,
    icon: feature.icon,
    description: feature.description,
    isMetered,
    access: row.access,
    allocation,
    usage: {
      used: row.usage,
      usedText: formatNumber(row.usage, locale),
      unit: featureName(feature, row.usage),
      limit,
      limitText: limit === null ? null : formatNumber(limit, locale),
      percent,
      state,
    },
    cost,
    unitPrice: unitPriceSummary,
    overageUnits:
      overageQuantity === null
        ? null
        : {
            quantity: overageQuantity,
            quantityText: formatNumber(overageQuantity, locale),
            unit: featureName(feature, overageQuantity),
          },
    tiers:
      price !== undefined && (priceBehavior === "tier" || tiered)
        ? tierSummary(price.tiers, price.tiersMode, price.currency, locale)
        : null,
    resetsAt:
      row.resetsAt === null
        ? null
        : { date: row.resetsAt, text: formatShortDate(row.resetsAt, locale) },
    expiresAt:
      row.expiresAt === null
        ? null
        : {
            date: row.expiresAt,
            text: formatDate(row.expiresAt, locale, { month: "short" }),
          },
    showMeter:
      isMetered &&
      priceBehavior !== "pay_as_you_go" &&
      priceBehavior !== "credit_burndown" &&
      limit !== null,
    canAddMore: priceBehavior === "pay_in_advance",
    hardLimit:
      showHardLimit &&
      priceBehavior !== null &&
      priceBehavior !== "credit_burndown" &&
      row.valueType === "numeric"
        ? row.valueNumeric
        : null,
  };
}
