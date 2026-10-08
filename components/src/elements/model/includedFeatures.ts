import type { FeatureUsage } from "@schematichq/schematic-react";

import {
  currentTier,
  isTieredPrice,
  pricePeriod,
  tierRanges,
  unitPrice,
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
 * Display parts for each feature the company is entitled to. Numbers, names
 * and dates arrive formatted; the element owns the wording, keyed by `kind`.
 */

/** What the company gets: an allocation, a price, or a tier. */
export type EntitlementText =
  /** "1,000 API calls" — an allocation, a soft limit, or a paid quantity. */
  | { kind: "units"; amount: string; units: string }
  /** "$0.01 per API call". */
  | { kind: "perUnit"; cost: string; unit: string }
  /** "$1.00 per 100 API calls". */
  | { kind: "perPackage"; cost: string; size: string; units: string }
  /** "Up to 1,000 API calls in this tier". */
  | { kind: "tierUpTo"; amount: string; feature: string }
  /** "Unlimited API calls in this tier". */
  | { kind: "tierUnlimited"; feature: string }
  /** "2 credits per use". */
  | { kind: "perUse"; amount: string; units: string }
  /** "Unlimited API calls". */
  | { kind: "unlimited"; item: string };

/** One piece of the usage line; the element joins them with " • ". */
export type UsageSegment =
  /** "$0.01/API call/mo" — pay in advance, untiered. */
  | {
      kind: "unitPricePerPeriod";
      cost: string;
      /** "100" for a package price; `null` for a price per unit. */
      size: string | null;
      units: string;
      /** A period key: "month", "quarter" or "year". */
      period: string;
    }
  /** "1,300 API calls used". */
  | { kind: "used"; amount: string; units: string }
  /** "$15.00", with "/mo" for a trait feature billed per period. */
  | { kind: "cost"; cost: string; period: string | null }
  /** "Resets Oct 1". */
  | { kind: "resets"; date: string };

/** When the usage line has no segments: "1,300 of 5,000 used", or "1,300 used". */
export type UsageSummary =
  | { kind: "limited"; amount: string; allocation: string }
  | { kind: "unlimited"; amount: string };

export interface PerLicenseCredits {
  amount: string;
  creditName: string;
  licenseName: string;
}

export interface IncludedFeatureRow {
  featureId: string;
  name: string;
  description: string | null;
  /** A schematic-icons glyph name; `null` when the feature has none. */
  icon: string | null;
  /** "Includes 10 credits per seat", one per per-license plan grant. */
  perLicenseCredits: PerLicenseCredits[];
  /** When a company override ends; `null` for a plan entitlement. */
  expiresAt: { date: Date; text: string } | null;
  entitlement: EntitlementText | null;
  usage: UsageSegment[];
  /** Shown when `usage` is empty. */
  usageSummary: UsageSummary | null;
  /**
   * The hard limit, for a numeric entitlement a price behavior bills past;
   * the element shows it only when the host asks.
   */
  hardLimit: { amount: string; units: string } | null;
  /** The price's tiers, for a tier-priced row or tiered pay-in-advance. */
  tiers: {
    ranges: TierRange[];
    currency: string;
    mode: "graduated" | "volume" | null;
    /** A period key, for flat tier fees billed per period. */
    period: string | null;
  } | null;
  /** The row as the API sent it, for a host that wants more. */
  source: FeatureUsage;
}

export interface DeriveIncludedFeaturesOptions extends UsageLimitOptions {
  locale: string;
  /** Feature ids to show, in this order; every feature when absent. */
  visibleFeatures?: string[];
  /** The "credits per use" line on credit-burning features. Default true. */
  showCredits?: boolean;
}

export function deriveIncludedFeatures(
  features: FeatureUsage[],
  options: DeriveIncludedFeaturesOptions,
): IncludedFeatureRow[] {
  const ordered =
    options.visibleFeatures === undefined
      ? features
      : options.visibleFeatures.flatMap((id) => {
          const row = features.find((f) => f.featureId === id);
          return row === undefined ? [] : [row];
        });
  return ordered.map((row) => includedFeatureRow(row, options));
}

function includedFeatureRow(
  row: FeatureUsage,
  options: DeriveIncludedFeaturesOptions,
): IncludedFeatureRow {
  const { locale } = options;
  const feature = {
    name: row.featureName,
    singularName: row.featureSingularName,
    pluralName: row.featurePluralName,
  };
  const expiresAt = usableDate(row.expiresAt);
  const tiered =
    row.priceBehavior === "pay_in_advance" && isTieredPrice(row.price);
  const period = pricePeriod(row.price);

  return {
    featureId: row.featureId,
    name: row.featureName,
    description: nonEmpty(row.featureDescription),
    icon: nonEmpty(row.featureIcon),
    perLicenseCredits: row.perLicenseCreditGrants
      .filter((grant) => grant.scaling === "per_license")
      .map((grant) => ({
        // Credits come in fractions as small as 1e-10.
        amount: formatNumber(grant.creditAmount, locale, {
          maximumFractionDigits: 10,
        }),
        creditName: featureName(
          {
            name: grant.creditName,
            singularName: grant.creditSingularName,
            pluralName: grant.creditPluralName,
          },
          grant.creditAmount,
          locale,
        ),
        licenseName: featureName(feature, 1, locale),
      })),
    expiresAt:
      expiresAt === undefined
        ? null
        : {
            date: expiresAt,
            text: formatDate(expiresAt, locale, { month: "short" }),
          },
    entitlement: entitlementText(row, options),
    usage: usageSegments(row, locale, tiered, period),
    usageSummary: usageSummary(row, options),
    hardLimit:
      row.priceBehavior !== undefined &&
      row.priceBehavior !== null &&
      row.priceBehavior !== "credit_burndown" &&
      row.valueType === "numeric" &&
      typeof row.allocation === "number"
        ? {
            amount: formatNumber(row.allocation, locale),
            units: featureName(feature, row.allocation, locale),
          }
        : null,
    tiers:
      (row.priceBehavior === "tier" || tiered) && row.price !== undefined
        ? {
            ranges: tierRanges(row.price),
            currency: row.price.currency,
            mode: row.price.tiersMode ?? null,
            period,
          }
        : null,
    source: row,
  };
}

/** Boolean features have no entitlement or usage line. */
function isMetered(row: FeatureUsage): boolean {
  return row.featureType === "event" || row.featureType === "trait";
}

function entitlementText(
  row: FeatureUsage,
  options: DeriveIncludedFeaturesOptions,
): EntitlementText | null {
  if (!isMetered(row)) {
    return null;
  }
  const { locale } = options;
  const feature = {
    name: row.featureName,
    singularName: row.featureSingularName,
    pluralName: row.featurePluralName,
  };
  const units = (count: number) => ({
    amount: formatNumber(count, locale),
    units: featureName(feature, count, locale),
  });

  switch (row.priceBehavior) {
    case "pay_in_advance":
      return typeof row.allocation === "number"
        ? { kind: "units", ...units(row.allocation) }
        : null;
    case "pay_as_you_go": {
      if (row.price === undefined) {
        return null;
      }
      const cost = formatCurrency(
        unitPrice(row.price),
        row.price.currency,
        locale,
      );
      const size = row.price.packageSize;
      return size > 1
        ? {
            kind: "perPackage",
            cost,
            size: formatNumber(size, locale),
            units: featureName(feature, size, locale),
          }
        : { kind: "perUnit", cost, unit: featureName(feature, 1, locale) };
    }
    case "overage":
      return typeof row.softLimit === "number"
        ? { kind: "units", ...units(row.softLimit) }
        : null;
    case "tier": {
      const tier = currentTier(row);
      if (tier === null) {
        return null;
      }
      return tier.to === null
        ? { kind: "tierUnlimited", feature: featureName(feature, 0, locale) }
        : {
            kind: "tierUpTo",
            amount: formatNumber(tier.to, locale),
            feature: featureName(feature, tier.to, locale),
          };
    }
    case "credit_burndown":
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

  if (typeof row.allocation === "number") {
    const limit = usageLimit(row, options) ?? row.allocation;
    return { kind: "units", ...units(limit) };
  }
  if (row.valueType === "unlimited") {
    return { kind: "unlimited", item: featureName(feature, 0, locale) };
  }
  return null;
}

function usageSegments(
  row: FeatureUsage,
  locale: string,
  tiered: boolean,
  period: string | null,
): UsageSegment[] {
  if (!isMetered(row)) {
    return [];
  }
  const feature = {
    name: row.featureName,
    singularName: row.featureSingularName,
    pluralName: row.featurePluralName,
  };
  const segments: UsageSegment[] = [];

  if (
    row.priceBehavior === "pay_in_advance" &&
    !tiered &&
    period !== null &&
    row.price !== undefined
  ) {
    const size = row.price.packageSize;
    segments.push({
      kind: "unitPricePerPeriod",
      cost: formatCurrency(unitPrice(row.price), row.price.currency, locale),
      size: size > 1 ? formatNumber(size, locale) : null,
      units: featureName(feature, size, locale),
      period,
    });
  } else if (
    (row.priceBehavior === "pay_as_you_go" ||
      row.priceBehavior === "overage" ||
      row.priceBehavior === "tier" ||
      row.priceBehavior === "credit_burndown" ||
      tiered) &&
    typeof row.usage === "number"
  ) {
    segments.push({
      kind: "used",
      amount: formatNumber(row.usage, locale),
      units: featureName(feature, row.usage, locale),
    });
  }

  if (
    typeof row.currentCost === "number" &&
    row.currentCost > 0 &&
    row.price !== undefined
  ) {
    segments.push({
      kind: "cost",
      cost: formatCurrency(row.currentCost, row.price.currency, locale),
      period: row.featureType === "trait" ? period : null,
    });
  }

  const resetsAt = usableDate(row.resetsAt);
  if (resetsAt !== undefined) {
    segments.push({
      kind: "resets",
      date: formatDate(resetsAt, locale, { month: "short", year: undefined }),
    });
  }

  return segments;
}

function usageSummary(
  row: FeatureUsage,
  options: DeriveIncludedFeaturesOptions,
): UsageSummary | null {
  if (!isMetered(row) || typeof row.usage !== "number") {
    return null;
  }
  const amount = formatNumber(row.usage, options.locale);
  if (typeof row.allocation === "number") {
    return {
      kind: "limited",
      amount,
      allocation: formatNumber(
        usageLimit(row, options) ?? row.allocation,
        options.locale,
      ),
    };
  }
  return { kind: "unlimited", amount };
}

function nonEmpty(value: string | null | undefined): string | null {
  return value === undefined || value === null || value === "" ? null : value;
}
