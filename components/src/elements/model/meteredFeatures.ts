import type { FeatureUsage } from "@schematichq/schematic-react";

import {
  currentTier,
  pricePeriod,
  tierRanges,
  usageLimit,
  type TierRange,
  type UsageLimitOptions,
} from "./featureUsage";
import {
  featureName,
  formatConsumptionRate,
  formatCurrency,
  formatDate,
  formatNumber,
  usableDate,
} from "./format";

/**
 * `deriveMeteredFeatures`: each event- or trait-based feature the company is
 * entitled to, as the usage card shows it — the headline figure, the limit
 * line, the meter, and the price details beneath. The wording is the
 * element's, keyed by `kind`; numbers, names and dates are formatted here.
 */

/** The headline: what is used, or, paid in advance, what was bought. */
export type MeteredHeadline =
  /** "12 Seats" — a quantity paid for in advance. */
  | { kind: "quantity"; amount: string | null; units: string }
  /** "1,300 API calls" + "used". */
  | { kind: "used"; amount: string; units: string };

/** The line under the headline, before "Resets …". */
export type MeteredLimit =
  | { kind: "tierUpTo"; amount: string; feature: string }
  | { kind: "tierUnlimited"; feature: string }
  /** "1,000 included" — an overage's soft limit. */
  | { kind: "included"; amount: string }
  /** "9 used" — a quantity paid for in advance, and how much of it is in use. */
  | { kind: "used"; amount: string }
  /** What pay-as-you-go usage has cost. */
  | { kind: "cost"; cost: string }
  | { kind: "perUse"; amount: string; units: string }
  | { kind: "limitOf"; amount: string }
  | { kind: "noLimit" };

/** How the meter reads: which part of it is filled, and in what tone. */
export type MeterTone = "tier" | "overage" | "ok" | "warning" | "critical";

export interface MeteredMeter {
  value: number;
  total: number;
  /** 0–100. Past an overage's soft limit, the included share of all usage. */
  percent: number;
  tone: MeterTone;
  /** "1,300/1,000", to ten fraction digits. */
  valueText: string;
  totalText: string;
}

export type MeteredPriceDetails =
  | {
      kind: "overage";
      /** The per-unit price past the soft limit. */
      unitPrice: string;
      packageSize: number;
      units: string;
      /** A period key, for a trait billed per period. */
      period: string | null;
      /** Usage past the soft limit, and what it costs. */
      overage: { amount: string; units: string; cost: string };
    }
  | {
      kind: "tier";
      from: number;
      /** `null` for the last, unbounded tier. */
      to: number | null;
      /** What the usage costs across the tiers; `null` when nothing does. */
      cost: string | null;
      period: string | null;
      tiers: {
        ranges: TierRange[];
        currency: string;
        mode: "graduated" | "volume" | null;
      };
    };

export interface MeteredFeatureRow {
  featureId: string;
  name: string;
  description: string | null;
  /** A schematic-icons glyph name; `null` when the feature has none. */
  icon: string | null;
  headline: MeteredHeadline | null;
  limit: MeteredLimit | null;
  /** "Resets Oct 1". */
  resetsAt: string | null;
  hardLimit: { amount: number; units: string } | null;
  meter: MeteredMeter | null;
  priceDetails: MeteredPriceDetails | null;
  /** Paid in advance, so more can be bought. */
  canAddMore: boolean;
  /** Event-based, so its usage breaks down by user. */
  hasUsageByUser: boolean;
  /** The feature's names, for a host labelling amounts itself. */
  unit: { name: string; singularName?: string; pluralName?: string };
  source: FeatureUsage;
}

export interface DeriveMeteredFeaturesOptions extends UsageLimitOptions {
  locale: string;
  /** Feature ids to show, in this order; every metered feature when absent. */
  visibleFeatures?: string[];
  /** The "credits per use" line on credit-burning features. Default true. */
  showCredits?: boolean;
}

/** The share of the limit at which the meter turns from ok to warning, and to critical. */
const TONES: MeterTone[] = [
  "ok",
  "ok",
  "ok",
  "warning",
  "critical",
  "critical",
];

export function deriveMeteredFeatures(
  features: FeatureUsage[],
  options: DeriveMeteredFeaturesOptions,
): MeteredFeatureRow[] {
  const ordered =
    options.visibleFeatures === undefined
      ? features
      : options.visibleFeatures.flatMap((id) => {
          const row = features.find((f) => f.featureId === id);
          return row === undefined ? [] : [row];
        });
  return ordered
    .filter((row) => row.featureType === "event" || row.featureType === "trait")
    .map((row) => meteredFeatureRow(row, options));
}

function meteredFeatureRow(
  row: FeatureUsage,
  options: DeriveMeteredFeaturesOptions,
): MeteredFeatureRow {
  const { locale } = options;
  const unit = {
    name: row.featureName,
    singularName: row.featureSingularName ?? undefined,
    pluralName: row.featurePluralName ?? undefined,
  };
  const limit = usageLimit(row, options);
  const resetsAt = usableDate(row.resetsAt);

  return {
    featureId: row.featureId,
    name: row.featureName,
    description:
      row.featureDescription === "" ? null : (row.featureDescription ?? null),
    icon: row.featureIcon === "" ? null : (row.featureIcon ?? null),
    headline: headline(row, limit, unit, locale),
    limit: limitLine(row, limit, unit, options),
    resetsAt:
      resetsAt === undefined
        ? null
        : formatDate(resetsAt, locale, { month: "short", year: undefined }),
    hardLimit:
      row.priceBehavior !== undefined &&
      row.priceBehavior !== null &&
      row.priceBehavior !== "credit_burndown" &&
      row.valueType === "numeric" &&
      typeof row.allocation === "number"
        ? {
            amount: row.allocation,
            units: featureName(unit, row.allocation, locale),
          }
        : null,
    meter: meter(row, options),
    priceDetails: priceDetails(row, unit, locale),
    canAddMore: row.priceBehavior === "pay_in_advance",
    hasUsageByUser: row.featureType === "event",
    unit,
    source: row,
  };
}

function headline(
  row: FeatureUsage,
  limit: number | null,
  unit: MeteredFeatureRow["unit"],
  locale: string,
): MeteredHeadline | null {
  if (row.priceBehavior === "pay_in_advance") {
    return {
      kind: "quantity",
      amount: limit === null ? null : formatNumber(limit, locale),
      units: featureName(unit, limit ?? 0, locale),
    };
  }
  if (typeof row.usage !== "number") {
    return null;
  }
  return {
    kind: "used",
    amount: formatNumber(row.usage, locale),
    units: featureName(unit, row.usage, locale),
  };
}

function limitLine(
  row: FeatureUsage,
  limit: number | null,
  unit: MeteredFeatureRow["unit"],
  options: DeriveMeteredFeaturesOptions,
): MeteredLimit | null {
  const { locale } = options;
  switch (row.priceBehavior) {
    case "tier": {
      const tier = currentTier(row);
      if (tier !== null) {
        return tier.to === null
          ? { kind: "tierUnlimited", feature: featureName(unit, 0, locale) }
          : {
              kind: "tierUpTo",
              amount: String(tier.to),
              feature: featureName(unit, 0, locale),
            };
      }
      break;
    }
    case "overage":
      if (limit !== null) {
        return { kind: "included", amount: formatNumber(limit, locale) };
      }
      break;
    case "pay_in_advance":
      if (typeof row.usage === "number") {
        return { kind: "used", amount: formatNumber(row.usage, locale) };
      }
      break;
    case "pay_as_you_go":
      if (typeof row.currentCost === "number" && row.price !== undefined) {
        return {
          kind: "cost",
          cost: formatCurrency(row.currentCost, row.price.currency, locale),
        };
      }
      break;
    case "credit_burndown":
      // Per use, and nothing in its place: the credit's balance is the
      // credits card's to show.
      if (
        options.showCredits === false ||
        typeof row.consumptionRate !== "number" ||
        row.creditName === undefined ||
        row.creditName === null
      ) {
        return null;
      }
      return {
        kind: "perUse",
        amount: formatConsumptionRate(row.consumptionRate, locale),
        units: featureName(
          {
            name: row.creditName,
            singularName: row.creditSingularName,
            pluralName: row.creditPluralName,
          },
          row.consumptionRate,
          locale,
        ),
      };
    default:
      break;
  }
  return limit === null
    ? { kind: "noLimit" }
    : { kind: "limitOf", amount: formatNumber(limit, locale) };
}

function meter(
  row: FeatureUsage,
  options: DeriveMeteredFeaturesOptions,
): MeteredMeter | null {
  if (
    row.priceBehavior === "pay_as_you_go" ||
    row.priceBehavior === "credit_burndown" ||
    typeof row.usage !== "number"
  ) {
    return null;
  }
  const total =
    options.showWarningThresholdAsLimit === true &&
    typeof row.warningThreshold === "number"
      ? row.warningThreshold
      : (row.softLimit ?? row.allocation ?? null);
  if (typeof total !== "number") {
    return null;
  }
  const usage = row.usage;
  const past = row.priceBehavior === "overage" && usage > total;
  const ratio = past
    ? Math.min(usage, total) / Math.max(usage, total)
    : total === 0
      ? 1
      : usage / total;
  const digits = { maximumFractionDigits: 10 };
  return {
    value: usage,
    total,
    percent: Math.min(ratio * 100, 100),
    tone:
      row.priceBehavior === "tier"
        ? "tier"
        : past
          ? "overage"
          : TONES[
              Math.floor(
                (total === 0 ? 1 : Math.min(usage, total) / total) *
                  (TONES.length - 1),
              )
            ],
    valueText: formatNumber(usage, options.locale, digits),
    totalText: formatNumber(total, options.locale, digits),
  };
}

function priceDetails(
  row: FeatureUsage,
  unit: MeteredFeatureRow["unit"],
  locale: string,
): MeteredPriceDetails | null {
  const price = row.price;
  if (price === undefined) {
    return null;
  }
  const tier = currentTier(row);
  const period = row.featureType === "trait" ? pricePeriod(price) : null;
  const money = (amount: number) =>
    formatCurrency(amount, price.currency, locale);

  if (row.priceBehavior === "overage") {
    if (tier === null || tier.perUnitPrice === null) {
      return null;
    }
    const size = price.packageSize;
    const over =
      typeof row.usage === "number" && typeof row.softLimit === "number"
        ? Math.max(0, row.usage - row.softLimit)
        : 0;
    return {
      kind: "overage",
      unitPrice: money(tier.perUnitPrice),
      packageSize: size,
      units: featureName(unit, size, locale),
      period,
      overage: {
        amount: formatNumber(over, locale),
        units: featureName(unit, over, locale),
        cost: money(tier.perUnitPrice * over),
      },
    };
  }
  if (row.priceBehavior === "tier") {
    // The embed shows the tier line only for a tier priced per unit.
    if (tier === null || tier.perUnitPrice === null) {
      return null;
    }
    return {
      kind: "tier",
      from: tier.from === 0 ? 1 : tier.from,
      to: tier.to,
      cost: typeof row.currentCost === "number" ? money(row.currentCost) : null,
      period,
      tiers: {
        ranges: tierRanges(price),
        currency: price.currency,
        mode: price.tiersMode ?? null,
      },
    };
  }
  return null;
}
