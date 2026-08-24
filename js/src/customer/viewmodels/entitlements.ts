import {
  type CatalogPlanEntitlementResponseData,
  type MetricPeriod,
  EntitlementPriceBehavior,
  EntitlementValueType,
} from "../api/public";

import {
  featureNameForCount,
  formatConsumptionRate,
  formatCurrency,
  formatNumber,
  type FormatOptions,
  isConfigured,
} from "./format";
import type { PricePeriod } from "./period";
import {
  derivePriceDisplay,
  priceValue,
  resolvePrice,
  type PriceDisplay,
} from "./prices";

export interface EntitlementFeature {
  description: string;
  icon: string;
  id: string;
  name: string;
  pluralName?: string;
  singularName?: string;
  type: string;
}

export interface EntitlementCredit {
  consumptionRate?: number;
  formattedConsumptionRate?: string;
  icon?: string;
  id: string;
  name: string;
  pluralName?: string;
  singularName?: string;
}

/**
 * The entitlement display decision tree, resolved to a discriminated kind:
 *
 * - "priced": usage is bought per unit/package (pay-in-advance or
 *   pay-as-you-go, non-tiered) — render the unit price.
 * - "tiered": tiered pricing — render the tier table.
 * - "credit_rate": credit burndown with a consumption rate — render
 *   "N credits per <feature>".
 * - "credit_limit": credit burndown where the plan's fixed grants imply a
 *   usage limit — render "up to N".
 * - "numeric": a numeric allocation — render the limit.
 * - "unlimited": unlimited allocation.
 * - "boolean": on/off feature — render the feature name alone.
 */
export type EntitlementKind =
  | "boolean"
  | "credit_limit"
  | "credit_rate"
  | "numeric"
  | "priced"
  | "tiered"
  | "unlimited";

export interface EntitlementSummary {
  credit?: EntitlementCredit;
  feature: EntitlementFeature;
  /** Feature name resolved for the row's quantity (limit or 1). */
  featureLabel: string;
  kind: EntitlementKind;
  /** The numeric allocation, when one applies. */
  limit?: number;
  formattedLimit?: string;
  /** Usage cadence, when the feature is metered over a period. */
  metricPeriod?: MetricPeriod;
  /**
   * Soft-limited (overage) entitlements: the soft limit, the per-unit
   * overage price, and — when the showHardLimit option is on and a hard
   * limit is configured — the hard limit usage can never exceed.
   */
  overage?: {
    formattedHardLimit?: string;
    formattedUnitPrice?: string;
    hardLimit?: number;
    softLimit: number;
  };
  /** The unit/package price, for priced and tiered rows. */
  price?: PriceDisplay;
  priceBehavior?: string;
  /** The author-configured warning threshold, when present. */
  warningThreshold?: number;
}

export interface EntitlementOptions extends FormatOptions {
  currency?: string;
  period?: PricePeriod;
  /** Surface the hard limit behind a soft (overage) limit. */
  showHardLimit?: boolean;
}

/**
 * The entitlement display block the derivation reads: a plan entitlement
 * (which adds `id`) or a company usage row (which adds usage facts) — both
 * carry this block, so one decision tree serves both.
 */
export type EntitlementBlock = Omit<CatalogPlanEntitlementResponseData, "id">;

const meteredPrice = (
  entitlement: EntitlementBlock,
  options: EntitlementOptions,
) => {
  const entity = {
    currencyPrices: entitlement.currencyPrices,
    monthlyPrice: entitlement.meteredMonthlyPrice,
    quarterlyPrice: entitlement.meteredQuarterlyPrice,
    yearlyPrice: entitlement.meteredYearlyPrice,
  };
  if (options.period !== undefined) {
    return resolvePrice(entity, options.period, options.currency);
  }
  return (
    entitlement.meteredMonthlyPrice ??
    entitlement.meteredQuarterlyPrice ??
    entitlement.meteredYearlyPrice
  );
};

export const deriveEntitlement = (
  entitlement: EntitlementBlock,
  options: EntitlementOptions = {},
): EntitlementSummary => {
  const feature: EntitlementFeature = {
    description: entitlement.featureDescription,
    icon: entitlement.featureIcon,
    id: entitlement.featureId,
    name: entitlement.featureName,
    ...(isConfigured(entitlement.featurePluralName)
      ? { pluralName: entitlement.featurePluralName }
      : {}),
    ...(isConfigured(entitlement.featureSingularName)
      ? { singularName: entitlement.featureSingularName }
      : {}),
    type: entitlement.featureType,
  };

  const row: EntitlementSummary = {
    feature,
    featureLabel: featureNameForCount(entitlement, 1),
    kind: "boolean",
  };
  if (entitlement.priceBehavior != null) {
    row.priceBehavior = entitlement.priceBehavior;
  }
  if (entitlement.metricPeriod != null) {
    row.metricPeriod = entitlement.metricPeriod;
  }
  if (entitlement.warningThreshold != null) {
    row.warningThreshold = entitlement.warningThreshold;
  }
  if (entitlement.creditId != null && entitlement.creditName != null) {
    row.credit = {
      id: entitlement.creditId,
      name: entitlement.creditName,
      ...(entitlement.creditIcon != null
        ? { icon: entitlement.creditIcon }
        : {}),
      ...(isConfigured(entitlement.creditPluralName)
        ? { pluralName: entitlement.creditPluralName }
        : {}),
      ...(isConfigured(entitlement.creditSingularName)
        ? { singularName: entitlement.creditSingularName }
        : {}),
      ...(entitlement.consumptionRate != null
        ? {
            consumptionRate: entitlement.consumptionRate,
            formattedConsumptionRate: formatConsumptionRate(
              entitlement.consumptionRate,
              options,
            ),
          }
        : {}),
    };
  }

  const setLimit = (limit: number) => {
    row.limit = limit;
    row.formattedLimit = formatNumber(limit, options);
    row.featureLabel = featureNameForCount(entitlement, limit);
  };

  const behavior = entitlement.priceBehavior;
  const price = meteredPrice(entitlement, options);
  const tiered =
    price !== undefined &&
    (price.priceTiers.length > 1 || price.tiersMode != null);

  // Overage detail applies orthogonally to the row kind.
  if (
    behavior === EntitlementPriceBehavior.Overage &&
    entitlement.softLimit != null
  ) {
    row.overage = {
      softLimit: entitlement.softLimit,
      ...(price?.overageUnitPriceDecimal != null
        ? {
            formattedUnitPrice: formatCurrency(
              Number(price.overageUnitPriceDecimal),
              price.currency,
              options,
            ),
          }
        : {}),
      ...(options.showHardLimit === true &&
      entitlement.valueNumeric != null &&
      entitlement.valueNumeric > entitlement.softLimit
        ? {
            hardLimit: entitlement.valueNumeric,
            formattedHardLimit: formatNumber(entitlement.valueNumeric, options),
          }
        : {}),
    };
  }

  if (behavior === EntitlementPriceBehavior.Tier || tiered) {
    row.kind = "tiered";
    if (price !== undefined) {
      row.price = derivePriceDisplay(price, options);
    }
    return row;
  }

  if (
    price !== undefined &&
    priceValue(price) > 0 &&
    (behavior === EntitlementPriceBehavior.PayInAdvance ||
      behavior === EntitlementPriceBehavior.PayAsYouGo)
  ) {
    row.kind = "priced";
    row.price = derivePriceDisplay(price, options);
    if (entitlement.valueNumeric != null) {
      setLimit(entitlement.valueNumeric);
    }
    return row;
  }

  if (behavior === EntitlementPriceBehavior.CreditBurndown) {
    if (entitlement.creditEquivalentLimit != null) {
      row.kind = "credit_limit";
      setLimit(entitlement.creditEquivalentLimit);
    } else {
      row.kind = "credit_rate";
    }
    return row;
  }

  if (behavior === EntitlementPriceBehavior.Overage) {
    row.kind = "numeric";
    setLimit(entitlement.softLimit ?? entitlement.valueNumeric ?? 0);
    return row;
  }

  switch (entitlement.valueType) {
    case EntitlementValueType.Unlimited:
      row.kind = "unlimited";
      row.featureLabel = featureNameForCount(entitlement, 2);
      break;
    case EntitlementValueType.Numeric:
    case EntitlementValueType.Trait:
      if (entitlement.valueNumeric != null) {
        row.kind = "numeric";
        setLimit(entitlement.valueNumeric);
      }
      break;
    default:
      break;
  }
  return row;
};
