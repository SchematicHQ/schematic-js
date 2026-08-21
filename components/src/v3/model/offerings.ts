import {
  isCompanyCatalog,
  type AnyCatalog,
  type CatalogPlan,
  type CompanyCatalogPlan,
  type CreditGrant,
  type CreditRef,
  type CustomPlanCta,
  type PlanInvalidReason,
} from "@schematichq/schematic-react";

import { deriveEntitlement, type EntitlementSummary } from "./entitlement";
import { featureName, formatCurrency, formatNumber } from "./format";
import { PERIOD_WORD, RECURRING_PERIODS, type PricePeriod } from "./period";
import {
  currenciesOf,
  findPrice,
  periodSavings,
  periodsOf,
  priceAmount,
  sameCurrency,
} from "./prices";

/**
 * `derivePlanOfferings`: the pricing table as a domain model — what is on
 * offer at a selection (period, currency), with every per-card decision
 * made and every number formatted, and the option sets the selection may
 * move within.
 */

export interface OfferingOptions {
  locale: string;
  /** Selected period; re-snapped to an offered one. Default: the first offered. */
  period?: PricePeriod;
  /** Selected currency; re-snapped to an offered one. Default: the catalog's. */
  currency?: string;
  /** Limit the currencies on offer (ISO 4217, any case). */
  currencyFilter?: string[];
  /** Show recurring prices as a monthly equivalent ("$8.33/month, billed yearly"). Default false. */
  showAsMonthlyPrices?: boolean;
  /** Render a $0 plan as "Free" rather than "$0.00". Default false. */
  showZeroPriceAsFree?: boolean;
  /** Show credit facts on entitlements and included-credit lines. Default true. */
  showCredits?: boolean;
  /** Disclose hard limits on priced entitlements. Default false. */
  showHardLimit?: boolean;
  /** Show warning thresholds as the advertised limits. Default false. */
  showWarningThresholdAsLimit?: boolean;
  /**
   * When false every card shows its own first available period instead of
   * the selection, and no plan is hidden for lacking the selected period.
   * Default true.
   */
  usePeriodSelection?: boolean;
}

export type PriceDisplay =
  | { kind: "custom"; text: string | null }
  | { kind: "usage_based" }
  | { kind: "free" }
  | {
      kind: "priced";
      amount: number;
      currency: string;
      /** "$10.00" — the monthly equivalent when `showAsMonthlyPrices` applies. */
      text: string;
      /** Period the shown amount recurs per. */
      period: PricePeriod;
      /** "month" / "year" / "one-time"; the suffix word. */
      periodWord: string;
      /** Set when `text` is a monthly equivalent of a longer period. */
      billedPeriodWord: string | null;
    }
  /** Priced plan with no price for the selection. */
  | { kind: "unavailable" };

export type PlanActionKind =
  /** The company's current plan at the selection. */
  | "current"
  /** Custom plan: hand off to the catalog's CTA URL. */
  | "custom"
  /** Select this plan / add-on. */
  | "select"
  /** Held add-on at the selection: the CTA removes it. */
  | "remove"
  /** Held add-on at another period: the CTA changes it. */
  | "change";

export interface PlanAction {
  kind: PlanActionKind;
  disabled: boolean;
  /** Why a `select` is disabled. */
  reason: PlanInvalidReason | "checkout_disabled" | null;
  /** Relative position to the current plan, for button styling. */
  direction: "downgrade" | "upgrade" | null;
  /** Custom plan CTA destination. */
  url: string | null;
  /** Replacement CTA when self-service downgrades are blocked. */
  downgradeBlocked: { label: string | null; url: string | null } | null;
  /** Start-a-trial offer on this plan. */
  trial: { days: number | null; paymentMethodRequired: boolean } | null;
}

export interface PlanCreditSummary {
  credit: CreditRef;
  icon: string | null;
  /** Flat credits per company. */
  quantity: number;
  quantityText: string;
  unit: string;
  /** "month" when the grant renews. */
  periodWord: string | null;
  /** Per-seat portion, when the grant scales with a license feature. */
  perLicense: {
    amount: number;
    amountText: string;
    unit: string;
    /** Singular name of the license feature, when it is among the plan's entitlements. */
    licenseName: string | null;
  } | null;
}

export interface PlanOffering {
  id: string;
  name: string;
  description: string;
  icon: string | null;
  isAddOn: boolean;
  /** The card's period: the selection, or `one_time` for one-time plans. */
  period: PricePeriod | null;
  price: PriceDisplay;
  /** The price point the CTA selects, when priced. */
  priceId: string | null;
  /** Name of the preceding plan, for "Everything in X, plus". */
  inclusionOf: string | null;
  entitlements: EntitlementSummary[];
  credits: PlanCreditSummary[];
  /** Company tier: the plan the company holds (any period). */
  isCurrent: boolean;
  /** Company tier: held at exactly this price (period + currency). */
  isActive: boolean;
  action: PlanAction;
  /** Feature names over the limit when the plan is invalid for the company. */
  usageViolations: string[];
}

export interface PlanOfferings {
  /** Recurring periods any plan or add-on is sold at, in toggle order. */
  periods: PricePeriod[];
  /** Currencies on offer, catalog default first. */
  currencies: string[];
  /** The selection after re-snapping. */
  period: PricePeriod;
  currency: string;
  plans: PlanOffering[];
  addOns: PlanOffering[];
  customPlan: CustomPlanCta | null;
  /** Fraction saved by the period versus monthly, for the toggle tooltip. */
  savings: Partial<Record<PricePeriod, number>>;
  /** Whether the catalog allows checkout at all. */
  canCheckout: boolean;
}

function isCompanyPlan(plan: CatalogPlan): plan is CompanyCatalogPlan {
  return "current" in plan;
}

function allPrices(catalog: AnyCatalog) {
  return [...catalog.plans, ...catalog.addOns].flatMap((plan) => plan.prices);
}

/** The first recurring period a plan is sold at in a currency. */
function ownPeriod(plan: CatalogPlan, currency: string): PricePeriod | null {
  return periodsOf(plan.prices, currency)[0] ?? null;
}

export function derivePlanCredits(
  grants: CreditGrant[],
  plan: Pick<CatalogPlan, "entitlements">,
  locale: string,
): PlanCreditSummary[] {
  const byCredit = new Map<string, PlanCreditSummary>();
  for (const grant of grants) {
    const existing = byCredit.get(grant.credit.id);
    const fixed =
      grant.scaling === "per_license" ? grant.companyAmount : grant.amount;
    const periodWord =
      grant.resetCadence === null
        ? null
        : RESET_CADENCE_WORD[grant.resetCadence];
    const licenseFeature =
      grant.licenseId === null
        ? undefined
        : plan.entitlements.find((e) => e.feature.id === grant.licenseId)
            ?.feature;
    const perLicense =
      grant.scaling === "per_license"
        ? {
            amount: grant.amount,
            amountText: formatNumber(grant.amount, locale),
            unit: featureName(grant.credit, grant.amount),
            licenseName:
              licenseFeature === undefined
                ? null
                : featureName(licenseFeature, 1),
          }
        : null;
    const quantity = (existing?.quantity ?? 0) + fixed;
    byCredit.set(grant.credit.id, {
      credit: grant.credit,
      icon: grant.credit.icon,
      quantity,
      quantityText: formatNumber(quantity, locale),
      unit: featureName(grant.credit, quantity),
      periodWord: periodWord ?? existing?.periodWord ?? null,
      perLicense: perLicense ?? existing?.perLicense ?? null,
    });
  }
  return [...byCredit.values()];
}

const RESET_CADENCE_WORD: Record<string, string> = {
  daily: "day",
  monthly: "month",
  quarterly: "quarter",
  weekly: "week",
  yearly: "year",
};

export function derivePlanOfferings(
  catalog: AnyCatalog,
  options: OfferingOptions,
): PlanOfferings {
  const {
    locale,
    showAsMonthlyPrices = false,
    showCredits = true,
    showHardLimit = false,
    showWarningThresholdAsLimit = false,
    showZeroPriceAsFree = false,
    usePeriodSelection = true,
  } = options;
  const company = isCompanyCatalog(catalog);
  const canCheckout = catalog.capabilities.checkout;
  const prices = allPrices(catalog);

  // Currencies: catalog default first, the rest alphabetical, then filtered.
  const filter = options.currencyFilter?.map((c) => c.toLowerCase());
  const offeredCurrencies = currenciesOf(prices);
  const defaultCurrency = catalog.defaultCurrency.toLowerCase();
  let currencies = [
    ...(offeredCurrencies.includes(defaultCurrency) ? [defaultCurrency] : []),
    ...offeredCurrencies.filter((c) => c !== defaultCurrency).sort(),
  ];
  if (filter !== undefined && filter.length > 0) {
    currencies = currencies.filter((c) => filter.includes(c));
  }
  if (currencies.length === 0) {
    currencies = [defaultCurrency];
  }
  const requestedCurrency = options.currency?.toLowerCase();
  const currency =
    requestedCurrency !== undefined && currencies.includes(requestedCurrency)
      ? requestedCurrency
      : currencies[0];

  // Periods: what the currency is sold at; re-snap the selection.
  const periods = periodsOf(prices, currency);
  const period =
    options.period !== undefined && periods.includes(options.period)
      ? options.period
      : (periods[0] ?? "month");

  const currentIndex = catalog.plans.findIndex(
    (plan) => isCompanyPlan(plan) && plan.current,
  );
  const currentPlan = currentIndex === -1 ? null : catalog.plans[currentIndex];

  const offering = (
    plan: CatalogPlan,
    index: number,
    isAddOn: boolean,
    previous: CatalogPlan | undefined,
  ): PlanOffering | null => {
    const decorated = isCompanyPlan(plan) ? plan : null;
    const isFreePlan = plan.chargeType === "free" || plan.prices.length === 0;
    const isOneTime = plan.chargeType === "one_time";
    const hasCurrency = plan.prices.some((p) =>
      sameCurrency(p.currency, currency),
    );
    if (!isFreePlan && !hasCurrency) {
      return null;
    }
    const cardPeriod: PricePeriod | null = isOneTime
      ? "one_time"
      : isFreePlan
        ? period
        : usePeriodSelection
          ? period
          : (ownPeriod(plan, currency) ?? period);
    const price =
      isFreePlan || cardPeriod === null
        ? undefined
        : findPrice(plan.prices, cardPeriod, currency);
    if (!isFreePlan && price === undefined && usePeriodSelection) {
      return null;
    }

    const entitlementOptions = {
      currency,
      locale,
      period: cardPeriod ?? period,
      showCredits,
      showHardLimit,
      showWarningThresholdAsLimit,
    };
    const rows = isAddOn
      ? plan.entitlements.filter(
          (e) =>
            e.valueType === "unlimited" ||
            (e.priceBehavior !== null && e.priceBehavior !== "credit_burndown"),
        )
      : plan.entitlements;
    const entitlements = rows.map((e) =>
      deriveEntitlement(e, entitlementOptions),
    );
    const isUsageBased =
      (isFreePlan || (price !== undefined && priceAmount(price) === 0)) &&
      plan.entitlements.some((e) => e.priceBehavior !== null);

    let priceDisplay: PriceDisplay;
    if (isUsageBased) {
      priceDisplay = { kind: "usage_based" };
    } else if (isFreePlan) {
      priceDisplay = showZeroPriceAsFree
        ? { kind: "free" }
        : {
            kind: "priced",
            amount: 0,
            currency,
            text: formatCurrency(0, currency, locale),
            period: cardPeriod ?? period,
            periodWord: PERIOD_WORD[cardPeriod ?? period],
            billedPeriodWord: null,
          };
    } else if (price === undefined || cardPeriod === null) {
      priceDisplay = { kind: "unavailable" };
    } else {
      const amount = priceAmount(price);
      const monthlyEquivalent =
        showAsMonthlyPrices &&
        (cardPeriod === "year" || cardPeriod === "quarter");
      const shown = monthlyEquivalent
        ? amount / (cardPeriod === "year" ? 12 : 3)
        : amount;
      priceDisplay =
        amount === 0 && showZeroPriceAsFree
          ? { kind: "free" }
          : {
              kind: "priced",
              amount,
              currency: price.currency,
              text: formatCurrency(shown, price.currency, locale, {
                preserveSubUnitPrecision: !monthlyEquivalent,
              }),
              period: cardPeriod,
              periodWord: monthlyEquivalent ? "month" : PERIOD_WORD[cardPeriod],
              billedPeriodWord: monthlyEquivalent
                ? PERIOD_WORD[cardPeriod]
                : null,
            };
    }

    const isCurrent = decorated?.current ?? false;
    const isActive =
      isCurrent &&
      (decorated?.currentPriceId === null ||
        decorated?.currentPriceId === (price?.id ?? null));
    const valid = decorated?.valid ?? true;
    const invalidReason = decorated?.invalidReason ?? null;
    const direction: PlanAction["direction"] =
      !isAddOn && currentIndex !== -1 && index !== currentIndex
        ? index > currentIndex
          ? "upgrade"
          : "downgrade"
        : null;
    const downgradeBlocked =
      company &&
      direction === "downgrade" &&
      catalog.checkoutBehavior.preventSelfServiceDowngrade
        ? {
            label:
              catalog.checkoutBehavior.preventSelfServiceDowngradeButtonText,
            url: catalog.checkoutBehavior.preventSelfServiceDowngradeUrl,
          }
        : invalidReason === "downgrade_not_permitted" && company
          ? {
              label:
                catalog.checkoutBehavior.preventSelfServiceDowngradeButtonText,
              url: catalog.checkoutBehavior.preventSelfServiceDowngradeUrl,
            }
          : null;
    const canTrial =
      plan.isTrialable &&
      !isAddOn &&
      (decorated === null || decorated.companyCanTrial);

    let kind: PlanActionKind = "select";
    if (isAddOn && isActive) {
      kind = "remove";
    } else if (isAddOn && isCurrent) {
      kind = "change";
    } else if (isActive) {
      kind = "current";
    }
    const disabled =
      kind !== "current" &&
      (!valid && downgradeBlocked === null ? true : !canCheckout);
    const action: PlanAction = {
      kind,
      disabled,
      reason: disabled ? (!valid ? invalidReason : "checkout_disabled") : null,
      direction,
      url: null,
      downgradeBlocked,
      trial:
        canTrial && kind === "select"
          ? {
              days: plan.trialDays,
              paymentMethodRequired:
                company &&
                catalog.checkoutBehavior.trialPaymentMethodRequired === true,
            }
          : null,
    };

    return {
      id: plan.id,
      name: plan.name,
      description: plan.description,
      icon: plan.icon === "" ? null : plan.icon,
      isAddOn,
      period: cardPeriod,
      price: priceDisplay,
      priceId: price?.id ?? null,
      inclusionOf: previous === undefined ? null : previous.name,
      entitlements,
      credits: showCredits
        ? derivePlanCredits(plan.includedCreditGrants, plan, locale)
        : [],
      isCurrent,
      isActive,
      action,
      usageViolations: (decorated?.usageViolations ?? []).map(
        (v) => v.featureName,
      ),
    };
  };

  const plans: PlanOffering[] = [];
  let previous: CatalogPlan | undefined;
  catalog.plans.forEach((plan, index) => {
    const card = offering(plan, index, false, previous);
    if (card !== null) {
      plans.push(card);
      previous = plan;
    }
  });
  const addOns = catalog.addOns.flatMap((addOn, index) => {
    const card = offering(addOn, index, true, undefined);
    if (card === null) {
      return [];
    }
    // Add-ons compatible only with other plans are still listed; the
    // company tier marks them invalid via `valid`. Public tier: no gating.
    return [card];
  });

  const savingsSource =
    currentPlan ??
    catalog.plans.find((p) => periodsOf(p.prices, currency).length > 1);
  const savings: Partial<Record<PricePeriod, number>> = {};
  if (savingsSource !== undefined) {
    for (const p of RECURRING_PERIODS) {
      const saving = periodSavings(savingsSource.prices, p, currency);
      if (saving !== null) {
        savings[p] = saving;
      }
    }
  }

  return {
    periods,
    currencies,
    period,
    currency,
    plans,
    addOns,
    customPlan: catalog.customPlanCta,
    savings,
    canCheckout,
  };
}
