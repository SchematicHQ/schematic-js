import {
  type CatalogCreditBundleResponseData,
  type CatalogCustomPlanCTAResponseData,
  type CatalogPlanResponseData,
  type CatalogPriceResponseData,
} from "../api/public";

import { deriveEntitlement, type EntitlementSummary } from "./entitlements";
import { isConfigured, type FormatOptions } from "./format";
import { offeredPeriods, PricePeriod } from "./period";
import {
  derivePriceDisplay,
  MONTHS_PER_PERIOD,
  PERIOD_ORDER,
  priceValue,
  resolvePrice,
  type PriceDisplay,
} from "./prices";

/**
 * Company decoration fields present when the catalog was fetched with a
 * temporary access token; absent on the anonymous catalog. Structural so
 * both generated plan families satisfy the input type.
 */
export interface CompanyPlanDecoration {
  companyCanTrial?: boolean;
  current?: boolean;
  invalidReason?: string | null;
  valid?: boolean;
}

export interface EntitlementDisplayOptions {
  /** Show the hard limit behind a soft (overage) limit. */
  showHardLimit?: boolean;
}

export type PlanOfferingInput = CatalogPlanResponseData & CompanyPlanDecoration;

export interface PlanOfferingsInput {
  addOns: PlanOfferingInput[];
  creditBundles?: CatalogCreditBundleResponseData[];
  customPlanCta?: CatalogCustomPlanCTAResponseData;
  /** The currency of every top-level price slot (ISO 4217). */
  defaultCurrency?: string;
  plans: PlanOfferingInput[];
}

/**
 * Display toggles — consumer props, never catalog data (RFC 0007). The
 * defaults match the legacy pricing table: period toggle and credits on,
 * zero prices shown as "Free", everything else off.
 */
export interface DisplayToggles {
  /** Show quarterly/yearly prices as their per-month equivalent. */
  showAsMonthlyPrices?: boolean;
  /** Show credit entitlements and included grants. */
  showCredits?: boolean;
  showFeatureDescription?: boolean;
  /** Show hard limits alongside soft (overage) limits. */
  showHardLimit?: boolean;
  showPeriodToggle?: boolean;
  /** Render a zero price as "Free" rather than a formatted zero. */
  showZeroPriceAsFree?: boolean;
}

export interface PlanOfferingsSelection extends FormatOptions, DisplayToggles {
  currency?: string;
  period?: PricePeriod;
}

export type PlanOfferingPrice =
  | { kind: "custom" }
  | { kind: "free" }
  | { kind: "priced"; price: PriceDisplay }
  | { kind: "unavailable" }
  | { kind: "usage_based" };

/** The custom-plan call to action, present only when actually configured. */
export interface CustomPlanCta {
  ctaText?: string;
  ctaUrl?: string;
  priceText?: string;
}

/**
 * Normalizes the catalog's custom-plan CTA: the API serializes an
 * unconfigured CTA as an object of nulls, which the generated deserializer
 * turns into an object of undefineds. Only configured fields survive, and
 * a CTA with nothing configured resolves to undefined so consumers can
 * gate the card on presence alone.
 */
const buildCustomPlanCta = (
  cta: CatalogCustomPlanCTAResponseData | undefined,
): CustomPlanCta | undefined => {
  if (cta === undefined) {
    return undefined;
  }
  const vm: CustomPlanCta = {
    ...(isConfigured(cta.ctaText) ? { ctaText: cta.ctaText } : {}),
    ...(isConfigured(cta.ctaUrl) ? { ctaUrl: cta.ctaUrl } : {}),
    ...(isConfigured(cta.priceText) ? { priceText: cta.priceText } : {}),
  };
  return Object.keys(vm).length > 0 ? vm : undefined;
};

export interface PlanOffering {
  /**
   * True when the company may start a trial of this plan (company catalogs
   * only): the plan is trialable and the company has never subscribed, or
   * is currently trialing it.
   */
  canTrial: boolean;
  /**
   * Add-ons on a company catalog: whether this add-on may be purchased
   * with the company's current plan. Undefined when there is no current
   * plan to compare against (anonymous catalogs, no plan held).
   */
  compatibleWithCurrentPlan?: boolean;
  /** True when this is the company's current plan (company catalogs only). */
  current: boolean;
  description: string;
  entitlements: EntitlementSummary[];
  icon: string;
  id: string;
  invalidReason?: string;
  isTrialable: boolean;
  name: string;
  /** Add-ons: plan IDs this may be purchased with; undefined = all. */
  compatiblePlanIds?: string[];
  price: PlanOfferingPrice;
  /**
   * Percent saved on the selected period versus paying monthly, when both
   * prices exist (e.g. 20 for "save 20% yearly").
   */
  savingsPercentVsMonthly?: number;
  trialDays?: number;
  /**
   * The period this card is priced at: the selected period for recurring
   * plans, one_time for one-time plans and add-ons regardless of the
   * selected period.
   */
  period: PricePeriod;
  /** False when the company's usage exceeds this plan's limits. */
  valid: boolean;
}

/** A credit bundle on offer, with its price in the selected currency. */
export interface CreditBundleOffering {
  bundleType: string;
  creditIcon?: string;
  creditId: string;
  creditName: string;
  id: string;
  name: string;
  /** Bundle price for fixed bundles. */
  price?: PriceDisplay;
  /** Credits per purchase; undefined = the buyer chooses a quantity. */
  quantity?: number;
  /** Per-credit price for custom-quantity bundles. */
  unitPrice?: PriceDisplay;
}

export interface PlanOfferings {
  addOns: PlanOffering[];
  creditBundles: CreditBundleOffering[];
  /** Currencies offered across the catalog; first entry is the default. */
  currencies: string[];
  customPlanCta?: CustomPlanCta;
  defaultCurrency: string;
  /** Periods offered by at least one plan, in display order. */
  periods: PricePeriod[];
  plans: PlanOffering[];
  /** The period actually applied after re-snapping an invalid selection. */
  selectedPeriod: PricePeriod;
  /** The currency actually applied; undefined = single-currency catalog. */
  selectedCurrency?: string;
  showPeriodToggle: boolean;
}

const availableCurrencies = (
  plans: PlanOfferingInput[],
  bundles: CatalogCreditBundleResponseData[],
  defaultCurrency: string | undefined,
): string[] => {
  const seen = new Set<string>();
  const ordered: string[] = [];
  const add = (currency: string | undefined) => {
    if (currency === undefined || currency === "") {
      return;
    }
    const normalized = currency.toLowerCase();
    if (!seen.has(normalized)) {
      seen.add(normalized);
      ordered.push(normalized);
    }
  };
  // The catalog's default currency leads; every other offered currency —
  // across every price slot, including one-time and bundle prices — sorts
  // alphabetically for a stable picker.
  add(defaultCurrency);
  for (const plan of plans) {
    for (const price of [
      plan.monthlyPrice,
      plan.quarterlyPrice,
      plan.yearlyPrice,
      plan.oneTimePrice,
    ]) {
      add(price?.currency);
    }
    for (const cp of plan.currencyPrices) {
      add(cp.currency);
    }
  }
  for (const bundle of bundles) {
    add(bundle.price?.currency);
    add(bundle.unitPrice?.currency);
    for (const cp of bundle.currencyPrices) {
      add(cp.currency);
    }
  }
  return [ordered[0], ...ordered.slice(1).sort()].filter(
    (currency): currency is string => currency !== undefined,
  );
};

const hasPricedEntitlements = (plan: PlanOfferingInput): boolean => {
  return plan.entitlements.some((e) => e.priceBehavior != null);
};

const buildPlanCard = (
  plan: PlanOfferingInput,
  selectedPeriod: PricePeriod,
  currency: string | undefined,
  toggles: DisplayToggles,
  options: FormatOptions,
  currentPlanId: string | undefined,
): PlanOffering => {
  // A one-time plan or add-on has exactly one price; it is shown at that
  // price whatever recurring period the table is toggled to.
  const offered = offeredPeriods(plan);
  const period =
    offered.length > 0 &&
    !offered.includes(selectedPeriod) &&
    plan.oneTimePrice != null
      ? PricePeriod.OneTime
      : selectedPeriod;
  const resolved = resolvePrice(plan, period, currency);

  let price: PlanOfferingPrice;
  if (resolved === undefined) {
    // Distinguish "not priced at this period at all" (usage-based) from
    // "priced, but not in the selected currency" (unavailable here).
    const pricedInAnyCurrency =
      resolvePrice(plan, period) !== undefined ||
      plan.currencyPrices.some(
        (cp) =>
          resolvePrice({ ...cp, currencyPrices: [] }, period) !== undefined,
      );
    price =
      offered.includes(period) && !pricedInAnyCurrency
        ? { kind: "usage_based" }
        : { kind: "unavailable" };
  } else if (priceValue(resolved) === 0) {
    price = hasPricedEntitlements(plan)
      ? { kind: "usage_based" }
      : toggles.showZeroPriceAsFree === false
        ? { kind: "priced", price: derivePriceDisplay(resolved, options) }
        : { kind: "free" };
  } else {
    price = {
      kind: "priced",
      price: derivePriceDisplay(resolved, {
        ...options,
        showAsMonthlyPrices: toggles.showAsMonthlyPrices === true,
      }),
    };
  }

  const entitlements = plan.entitlements.filter(
    (entitlement) =>
      toggles.showCredits !== false || entitlement.creditId == null,
  );

  const card: PlanOffering = {
    canTrial: plan.companyCanTrial === true,
    current: plan.current === true,
    description: plan.description,
    entitlements: entitlements.map((entitlement) =>
      deriveEntitlement(entitlement, {
        ...options,
        currency,
        period,
        showHardLimit: toggles.showHardLimit === true,
      }),
    ),
    icon: plan.icon,
    id: plan.id,
    isTrialable: plan.isTrialable,
    name: plan.name,
    period,
    price,
    valid: plan.valid !== false,
  };
  if (plan.invalidReason != null) {
    card.invalidReason = plan.invalidReason;
  }
  if (plan.trialDays != null) {
    card.trialDays = plan.trialDays;
  }
  // null/undefined = compatible with every plan (the API serializes
  // unrestricted add-ons as null), so only an explicit list restricts.
  if (plan.compatiblePlanIds != null && plan.compatiblePlanIds.length > 0) {
    card.compatiblePlanIds = plan.compatiblePlanIds;
  }
  if (currentPlanId !== undefined) {
    card.compatibleWithCurrentPlan =
      card.compatiblePlanIds === undefined ||
      card.compatiblePlanIds.includes(currentPlanId);
  }

  const months = MONTHS_PER_PERIOD[period];
  if (
    months !== undefined &&
    months > 1 &&
    resolved !== undefined &&
    priceValue(resolved) > 0
  ) {
    const monthly = resolvePrice(plan, PricePeriod.Month, currency);
    if (monthly !== undefined && priceValue(monthly) > 0) {
      const baseline = priceValue(monthly) * months;
      const saved = ((baseline - priceValue(resolved)) / baseline) * 100;
      if (saved > 0) {
        card.savingsPercentVsMonthly = Math.round(saved * 100) / 100;
      }
    }
  }

  return card;
};

const buildCreditBundle = (
  bundle: CatalogCreditBundleResponseData,
  currency: string | undefined,
  options: FormatOptions,
): CreditBundleOffering => {
  // Top-level prices are the default currency; currency_prices carries the
  // others, keyed by the bundle's type (price vs unit_price). A top-level
  // price only stands in when it is actually in the selected currency —
  // never show a USD price under a EUR selection.
  const inCurrency = (
    price: CatalogPriceResponseData | undefined,
  ): CatalogPriceResponseData | undefined =>
    price !== undefined &&
    (currency === undefined ||
      price.currency.toLowerCase() === currency.toLowerCase())
      ? price
      : undefined;
  const match =
    currency !== undefined
      ? bundle.currencyPrices.find(
          (cp) => cp.currency.toLowerCase() === currency.toLowerCase(),
        )
      : undefined;
  const price = match?.price ?? inCurrency(bundle.price);
  const unitPrice = match?.unitPrice ?? inCurrency(bundle.unitPrice);
  return {
    bundleType: bundle.bundleType,
    ...(bundle.creditIcon != null ? { creditIcon: bundle.creditIcon } : {}),
    creditId: bundle.creditId,
    creditName: bundle.creditName,
    id: bundle.id,
    name: bundle.name,
    ...(price !== undefined
      ? { price: derivePriceDisplay(price, options) }
      : {}),
    ...(bundle.quantity != null ? { quantity: bundle.quantity } : {}),
    ...(unitPrice !== undefined
      ? { unitPrice: derivePriceDisplay(unitPrice, options) }
      : {}),
  };
};

/**
 * Derives the plan offerings: resolves the period/currency selection
 * against what the catalog actually offers (re-snapping invalid
 * selections), and renders each plan, add-on, and credit bundle with its
 * price display and entitlement rows. Display toggles are consumer
 * options, not catalog data.
 */
export const derivePlanOfferings = (
  catalog: PlanOfferingsInput,
  selection: PlanOfferingsSelection = {},
): PlanOfferings => {
  const everything = [...catalog.plans, ...catalog.addOns];

  const periods = PERIOD_ORDER.filter((period) =>
    everything.some((plan) => offeredPeriods(plan).includes(period)),
  );
  const selectedPeriod =
    selection.period !== undefined && periods.includes(selection.period)
      ? selection.period
      : (periods[0] ?? PricePeriod.Month);

  const bundles = catalog.creditBundles ?? [];
  const currencies = availableCurrencies(
    everything,
    bundles,
    catalog.defaultCurrency,
  );
  let selectedCurrency: string | undefined;
  if (currencies.length > 0) {
    selectedCurrency =
      selection.currency !== undefined &&
      currencies.includes(selection.currency.toLowerCase())
        ? selection.currency.toLowerCase()
        : currencies[0];
  }

  const options: FormatOptions = {
    ...(selection.locale !== undefined ? { locale: selection.locale } : {}),
  };
  const currentPlanId = catalog.plans.find((plan) => plan.current === true)?.id;
  const toCard = (plan: PlanOfferingInput) =>
    buildPlanCard(
      plan,
      selectedPeriod,
      selectedCurrency,
      selection,
      options,
      currentPlanId,
    );

  const customPlanCta = buildCustomPlanCta(catalog.customPlanCta);

  return {
    addOns: catalog.addOns.map(toCard),
    creditBundles:
      selection.showCredits === false
        ? []
        : bundles.map((bundle) =>
            buildCreditBundle(bundle, selectedCurrency, options),
          ),
    currencies,
    ...(customPlanCta !== undefined ? { customPlanCta } : {}),
    defaultCurrency:
      (isConfigured(catalog.defaultCurrency)
        ? catalog.defaultCurrency.toLowerCase()
        : undefined) ??
      selectedCurrency ??
      currencies[0] ??
      "usd",
    periods,
    plans: catalog.plans.map(toCard),
    selectedPeriod,
    ...(selectedCurrency !== undefined ? { selectedCurrency } : {}),
    showPeriodToggle:
      selection.showPeriodToggle !== false &&
      periods.filter((period) => period !== PricePeriod.OneTime).length > 1,
  };
};
