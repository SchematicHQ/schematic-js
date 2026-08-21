import {
  EntitlementPriceBehavior,
  type CompanyFeatureUsageResponseData,
} from "../api/customer";

import { deriveEntitlement, type EntitlementSummary } from "./entitlements";
import {
  formatCurrency,
  formatDate,
  formatNumber,
  type FormatOptions,
} from "./format";
import { PricePeriod } from "./period";
import { resolvePrice } from "./prices";

export type UsageState = "ok" | "over_limit" | "warning";

export interface UsageSummary {
  /** Whether further usage is permitted. */
  access: boolean;
  /** Cost of the usage so far in minor units (metered entitlements). */
  currentCost?: number;
  /** The entitlement's display decision, shared with plan cards. */
  entitlement: EntitlementSummary;
  featureIcon?: string;
  featureId: string;
  featureName: string;
  featureType: string;
  formattedCurrentCost?: string;
  formattedLimit?: string;
  formattedResetsAt?: string;
  formattedUsed: string;
  /**
   * The display limit: the server's effective limit (soft limit for
   * overage, first tier bound for tiered, base allocation otherwise).
   * Undefined = unlimited or unmeasured.
   */
  limit?: number;
  /** Usage beyond the soft limit (overage pricing), when any. */
  overuse?: number;
  /** Fill percentage for the meter, clamped to [0, 100]. */
  percent?: number;
  priceBehavior?: string;
  resetsAt?: Date;
  /** Whether the entitlement comes from the plan or a company override. */
  source: string;
  state: UsageState;
  used: number;
}

export interface UsageOptions extends FormatOptions {
  currency?: string;
  period?: PricePeriod;
  /**
   * Percent at which the meter enters the warning state before the limit
   * is reached. When given it wins; otherwise the entitlement's own
   * warning_threshold (an absolute value) applies, then 90%.
   */
  warningPercent?: number;
}

/**
 * Derives the usage summary for one feature-usage row. The row is the
 * server's display shape — the entitlement block plus effective limit,
 * percent used, and current cost — so this derives only presentation
 * state.
 */
export const deriveUsage = (
  usage: CompanyFeatureUsageResponseData,
  options: UsageOptions = {},
): UsageSummary => {
  const used = usage.usage;
  const limit = usage.effectiveLimit ?? usage.softLimit ?? usage.valueNumeric;

  let percent: number | undefined;
  if (usage.percentUsed != null) {
    percent = usage.percentUsed;
  } else if (limit != null && limit > 0) {
    percent = (used / limit) * 100;
  }

  const overuse =
    usage.priceBehavior === EntitlementPriceBehavior.Overage &&
    usage.softLimit != null &&
    used > usage.softLimit
      ? used - usage.softLimit
      : undefined;
  const overLimit =
    !usage.access ||
    overuse !== undefined ||
    (percent !== undefined && percent > 100);
  const warning =
    options.warningPercent !== undefined
      ? percent !== undefined && percent >= options.warningPercent
      : usage.warningThreshold != null
        ? used >= usage.warningThreshold
        : percent !== undefined && percent >= 90;
  const state: UsageState = overLimit
    ? "over_limit"
    : warning
      ? "warning"
      : "ok";

  const vm: UsageSummary = {
    access: usage.access,
    entitlement: deriveEntitlement(usage, options),
    featureId: usage.featureId,
    featureName: usage.featureName,
    featureType: usage.featureType,
    formattedUsed: formatNumber(used, options),
    source: usage.source,
    state,
    used,
  };
  if (usage.featureIcon !== "") {
    vm.featureIcon = usage.featureIcon;
  }
  if (limit != null) {
    vm.limit = limit;
    vm.formattedLimit = formatNumber(limit, options);
  }
  if (percent !== undefined) {
    vm.percent = Math.max(0, Math.min(100, percent));
  }
  if (usage.priceBehavior != null) {
    vm.priceBehavior = usage.priceBehavior;
  }
  if (overuse !== undefined) {
    vm.overuse = overuse;
  }
  if (usage.resetsAt != null) {
    vm.resetsAt = usage.resetsAt;
    vm.formattedResetsAt = formatDate(usage.resetsAt, options);
  }
  // The cost is billed in the subscription's currency: the metered price
  // at the selected period and currency, falling back to any priced slot.
  const meteredEntity = {
    currencyPrices: usage.currencyPrices,
    monthlyPrice: usage.meteredMonthlyPrice,
    quarterlyPrice: usage.meteredQuarterlyPrice,
    yearlyPrice: usage.meteredYearlyPrice,
  };
  const costCurrency =
    resolvePrice(
      meteredEntity,
      options.period ?? PricePeriod.Month,
      options.currency,
    )?.currency ??
    usage.meteredMonthlyPrice?.currency ??
    usage.meteredQuarterlyPrice?.currency ??
    usage.meteredYearlyPrice?.currency;
  if (usage.currentCost != null && costCurrency !== undefined) {
    vm.currentCost = usage.currentCost;
    vm.formattedCurrentCost = formatCurrency(
      usage.currentCost,
      costCurrency,
      options,
    );
  }
  return vm;
};
