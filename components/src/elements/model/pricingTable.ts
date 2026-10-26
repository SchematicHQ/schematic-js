import type {
  CatalogEntitlement,
  CatalogPlan,
  CatalogView,
  Company,
  PublicCatalogPlan,
} from "@schematichq/schematic-react";

import type { CheckoutSelection } from "./checkoutConfig";
import { isTieredPrice, tierRanges, type TierRange } from "./featureUsage";
import {
  featureName,
  formatConsumptionRate,
  formatCredits,
  formatCurrency,
  formatNumber,
  formatPercent,
} from "./format";

/**
 * Display parts for a pricing table: the periods and currencies on offer,
 * and a card per plan and add-on priced in the ones chosen. Numbers, names
 * and prices arrive formatted; the element owns the wording, keyed by
 * `kind`. Which plan is current, valid or trialable is the server's to say,
 * and the public catalog says none of it.
 */

export type PricingPeriod = "month" | "quarter" | "year";

const PERIODS: readonly PricingPeriod[] = ["month", "quarter", "year"];

const CADENCE_PERIOD: Record<string, PricingPeriod> = {
  monthly: "month",
  quarterly: "quarter",
  yearly: "year",
};

type AnyPlan = CatalogPlan | PublicCatalogPlan;
type Price = NonNullable<CatalogPlan["monthlyPrice"]>;
type Grant = CatalogPlan["includedCreditGrants"][number];

/** What a card costs in the chosen period and currency. */
export type PricingPrice =
  /** "$25.00", per `period`; `null` for a one-time add-on. */
  | { kind: "amount"; amount: string; period: PricingPeriod | null }
  /** Priced at zero, with `showZeroPriceAsFree`. */
  | { kind: "free" }
  /** Priced at zero, and billed by what it is used. */
  | { kind: "usageBased" };

/** What an entitlement grants, worded by the element. */
export type PricingEntitlementText =
  /** "API calls": a boolean feature, or a tiered one. */
  | { kind: "name"; name: string }
  /** "Unlimited API calls". */
  | { kind: "unlimited"; item: string }
  /** "1,000 API calls", with "per month" for a metric period. */
  | { kind: "units"; amount: string; units: string; period: string | null }
  /** "$0.01 per API call", with "per month" for one paid in advance. */
  | {
      kind: "perUnit";
      cost: string;
      size: string | null;
      units: string;
      period: PricingPeriod | null;
    }
  /** "4 credits per API call". */
  | { kind: "perUse"; amount: string; credits: string; unit: string }
  /** "Up to 25 API calls", per period when the credit renews. */
  | { kind: "upTo"; amount: string; units: string; period: string | null };

/** The line beneath an entitlement's text. */
export type PricingEntitlementDetail =
  /** "then $0.50/API call", "/mo" for a trait feature. */
  | {
      kind: "overage";
      cost: string;
      size: string | null;
      units: string;
      period: PricingPeriod | null;
    }
  /** "Tier-based", with the tiers in a tip. */
  | { kind: "tiered" };

export interface PricingEntitlementRow {
  featureId: string;
  /** A schematic-icons glyph name; `null` when the feature has none. */
  icon: string | null;
  description: string | null;
  text: PricingEntitlementText;
  detail: PricingEntitlementDetail | null;
  tiers: {
    ranges: TierRange[];
    currency: string;
    mode: "graduated" | "volume" | null;
    period: PricingPeriod | null;
    unit: string;
  } | null;
  /** The limit a priced numeric entitlement is billed up to. */
  hardLimit: { amount: string; units: string } | null;
  source: CatalogEntitlement;
}

/** "100 AI credits per month", one per credit the plan grants and shows. */
export interface PricingCreditLine {
  creditId: string;
  icon: string | null;
  amount: string;
  creditName: string;
  /** "month", "year", …; `null` for a grant that does not renew. */
  period: string | null;
  /** "seat", for a grant per license. */
  perLicense: string | null;
  /**
   * What the plan grants the company outright beside a grant per license,
   * worded under it: "Plus 100 AI credits per month for your company".
   */
  plus: { amount: string; creditName: string; period: string | null } | null;
}

/** What a card's call to action does, decided by the server's standing. */
export type PricingAction =
  /** The company's plan in this period: no action, "Current plan". */
  | { kind: "current" }
  /** "Choose plan"; `upgrade` sits above the current plan. */
  | { kind: "choose"; upgrade: boolean }
  /** An add-on the company holds: "Remove add-on". */
  | { kind: "remove" }
  /** An add-on the company holds in another period: "Change add-on". */
  | { kind: "change" }
  /** Over a limit the plan would set: disabled, with the violations. */
  | { kind: "overLimit"; violations: PricingViolation[] }
  /** A downgrade the account does not allow in self-service. */
  | { kind: "downgradeBlocked"; text: string | null; url: string | null }
  /** The company cannot check out at all: a disabled "Choose plan". */
  | { kind: "unavailable" };

export interface PricingViolation {
  featureName: string;
  usage: string;
  limit: string | null;
}

export interface PricingCard {
  id: string;
  name: string;
  description: string | null;
  price: PricingPrice;
  /** The price the card's period and currency picked, for a checkout. */
  priceId: string | null;
  /** The card's period: the chosen one, or `null` for one-time. */
  period: PricingPeriod | null;
  credits: PricingCreditLine[];
  entitlements: PricingEntitlementRow[];
  /** `null` in the public catalog, where there is no company. */
  action: PricingAction | null;
  /** The company's plan in the chosen period, for the card's outline. */
  active: boolean;
  trialDays: number | null;
  source: AnyPlan;
}

export interface PricingCustomPlan {
  priceText: string | null;
  ctaText: string | null;
  ctaUrl: string | null;
}

export interface PricingTableView {
  source: CatalogView["source"];
  /** In month, quarter, year order; empty when nothing recurs. */
  periods: PricingPeriod[];
  /** One of `periods`, or `null` when there are none. */
  period: PricingPeriod | null;
  currencies: string[];
  currency: string;
  plans: PricingCard[];
  addOns: PricingCard[];
  /** The catalog's custom-plan call to action, when it offers one. */
  customPlan: PricingCustomPlan | null;
  /**
   * What the company's plan saves over paying monthly, by period, as a
   * percentage: "16.67%". Empty in the public catalog, and without a
   * current plan priced monthly.
   */
  savings: Partial<Record<PricingPeriod, string>>;
  /** The company's trial, for the current card's badge. */
  trialDaysLeft: { count: number; days: string } | null;
  /** The add-ons the company holds, shown or not; empty in the public catalog. */
  heldAddOnIds: string[];
}

export interface DerivePricingTableOptions {
  locale: string;
  /** The period asked for; one the catalog does not offer falls back. */
  period?: PricingPeriod;
  /** The currency asked for; one the catalog does not offer falls back. */
  currency?: string;
  /**
   * The company, for the period its subscription bills in: the current
   * plan is current only in that period, and it is the default one.
   */
  company?: Company;
  /** Included credits on each card. Default true. */
  showCredits?: boolean;
  /** A plan priced at zero reads "Free". Default false. */
  showZeroPriceAsFree?: boolean;
  /**
   * Show an entitlement's warning threshold in place of its limit, where one
   * is configured. Default false.
   */
  showWarningThresholdAsLimit?: boolean;
  /** For the trial countdown; the clock otherwise. */
  now?: Date;
}

export function derivePricingTable(
  view: CatalogView,
  options: DerivePricingTableOptions,
): PricingTableView {
  const { catalog } = view;
  const plans: AnyPlan[] = catalog.plans;
  const addOns: AnyPlan[] = catalog.addOns;

  const currencies = unique(
    [...plans, ...addOns].flatMap((plan) =>
      plan.currencyPrices.map((prices) => prices.currency.toLowerCase()),
    ),
  );
  const defaultCurrency = catalog.defaultCurrency?.toLowerCase();
  const currency =
    pick(currencies, options.currency?.toLowerCase(), [defaultCurrency]) ??
    defaultCurrency ??
    "usd";

  const priced = (plan: AnyPlan) => supportsCurrency(plan, currency);
  const periods = PERIODS.filter((period) =>
    [...plans, ...addOns]
      .filter(priced)
      .some((plan) => periodsOf(plan).includes(period)),
  );
  const subscription = options.company?.subscription;
  const currentPeriod = asPeriod(
    subscription?.period ?? options.company?.plan?.period,
  );
  const period = pick(periods, options.period, [currentPeriod]) ?? null;

  const shown = (plan: AnyPlan) =>
    priced(plan) &&
    (isOneTime(plan) ||
      periodsOf(plan).length === 0 ||
      (period !== null && periodsOf(plan).includes(period)));

  const context: CardContext = {
    view,
    currency,
    period,
    currentPeriod,
    options,
  };
  const planCards = plans.filter(shown);
  const currentIndex = planCards.findIndex((plan) => standing(plan).current);

  return {
    source: view.source,
    periods,
    period,
    currencies,
    currency,
    plans: planCards.map((plan, index) =>
      card(plan, context, { kind: "plan", index, currentIndex }),
    ),
    addOns: addOns
      .filter(shown)
      .map((addOn) => card(addOn, context, { kind: "addOn" })),
    customPlan:
      catalog.customPlanCta === undefined || catalog.customPlanCta === null
        ? null
        : {
            priceText: nonEmpty(catalog.customPlanCta.priceText),
            ctaText: nonEmpty(catalog.customPlanCta.ctaText),
            ctaUrl: nonEmpty(catalog.customPlanCta.ctaUrl),
          },
    savings: savings(
      planCards.find((plan) => standing(plan).current),
      currency,
      options.locale,
    ),
    trialDaysLeft: trialDaysLeft(options.company, options),
    heldAddOnIds: addOns
      .filter((addOn) => standing(addOn).current)
      .map((addOn) => addOn.id),
  };
}

/** What a card's action does: `remove` and `change` are for a held add-on. */
export type PricingSelectionAction = "choose" | "remove" | "change";

export function selectionAction(card: PricingCard): PricingSelectionAction {
  const kind = card.action?.kind;
  return kind === "remove" || kind === "change" ? kind : "choose";
}

/**
 * The cart a card's action opens a checkout on. A checkout starts from the
 * add-ons it is given, so every add-on action restates the whole list; a
 * held add-on changes by taking the card's period, which the checkout
 * applies to the subscription.
 */
export function checkoutSelectionFor(
  view: PricingTableView,
  card: PricingCard,
  kind: "plan" | "addOn",
): CheckoutSelection {
  const period = card.period ?? undefined;
  const { currency, heldAddOnIds: held } = view;
  if (kind === "plan") {
    return { planId: card.id, period, currency };
  }
  switch (selectionAction(card)) {
    case "remove":
      return { addOnIds: held.filter((id) => id !== card.id), currency };
    case "change":
      return { addOnIds: held, period, currency };
    case "choose":
      return {
        addOnIds: held.includes(card.id) ? held : [...held, card.id],
        period,
        currency,
      };
  }
}

const PERIOD_MONTHS: Record<PricingPeriod, number> = {
  month: 1,
  quarter: 3,
  year: 12,
};

/** Against twelve or three months of the plan's monthly price. */
function savings(
  plan: AnyPlan | undefined,
  currency: string,
  locale: string,
): Partial<Record<PricingPeriod, string>> {
  const out: Partial<Record<PricingPeriod, string>> = {};
  const monthly =
    plan === undefined ? undefined : planPrice(plan, currency, "month");
  if (plan === undefined || monthly === undefined || amountOf(monthly) <= 0) {
    return out;
  }
  for (const period of ["quarter", "year"] as const) {
    const price = planPrice(plan, currency, period);
    if (price === undefined) {
      continue;
    }
    const baseline = amountOf(monthly) * PERIOD_MONTHS[period];
    const saved = (baseline - amountOf(price)) / baseline;
    if (saved > 0) {
      out[period] = formatPercent(saved, locale);
    }
  }
  return out;
}

interface CardContext {
  view: CatalogView;
  currency: string;
  period: PricingPeriod | null;
  currentPeriod: PricingPeriod | null;
  options: DerivePricingTableOptions;
}

type CardRole =
  { kind: "plan"; index: number; currentIndex: number } | { kind: "addOn" };

function card(
  plan: AnyPlan,
  context: CardContext,
  role: CardRole,
): PricingCard {
  const { currency, options } = context;
  const { locale } = options;
  const oneTime = isOneTime(plan);
  const period =
    oneTime || periodsOf(plan).length === 0 ? null : context.period;
  const price = planPrice(plan, currency, oneTime ? "oneTime" : period);
  const entitlements = plan.entitlements;
  const amount = price === undefined ? 0 : amountOf(price);
  const usageBased = entitlements.some(
    (entitlement) =>
      entitlement.priceBehavior !== undefined &&
      entitlement.priceBehavior !== null,
  );
  const grants = plan.includedCreditGrants.filter(
    (grant) => grant.visible !== false,
  );
  const { current } = standing(plan);
  // A plan is the company's in the period it bills in, and in any period
  // when the company's own period is not known.
  const active =
    current &&
    (period === null ||
      context.currentPeriod === null ||
      period === context.currentPeriod);

  return {
    id: plan.id,
    name: plan.name,
    description: nonEmpty(plan.description),
    price:
      amount === 0 && usageBased
        ? { kind: "usageBased" }
        : amount === 0 && options.showZeroPriceAsFree === true
          ? { kind: "free" }
          : {
              kind: "amount",
              amount: formatCurrency(amount, currency, locale),
              period,
            },
    priceId: price?.id ?? null,
    period,
    credits:
      options.showCredits === false
        ? []
        : creditLines(grants, entitlements, locale),
    entitlements: entitlements.map((entitlement) =>
      entitlementRow(entitlement, context, period, grants),
    ),
    action:
      context.view.source === "public"
        ? null
        : action(plan, context, role, active),
    active,
    trialDays:
      plan.isTrialable && typeof plan.trialDays === "number"
        ? plan.trialDays
        : null,
    source: plan,
  };
}

function action(
  plan: AnyPlan,
  context: CardContext,
  role: CardRole,
  active: boolean,
): PricingAction {
  const { valid, invalidReason, usageViolations, current } = standing(plan);
  if (role.kind === "addOn") {
    if (active) {
      return { kind: "remove" };
    }
    if (current) {
      return { kind: "change" };
    }
  } else if (active) {
    return { kind: "current" };
  }

  const view = context.view;
  if (view.source === "company") {
    const { catalog } = view;
    if (!valid && invalidReason === "downgrade_not_permitted") {
      return {
        kind: "downgradeBlocked",
        text: nonEmpty(catalog.preventSelfServiceDowngradeButtonText),
        url: nonEmpty(catalog.preventSelfServiceDowngradeUrl),
      };
    }
    if (!valid) {
      return {
        kind: "overLimit",
        violations: usageViolations.map((violation) => ({
          featureName: violation.featureName,
          usage: formatNumber(violation.usage, context.options.locale),
          limit:
            typeof violation.limit === "number"
              ? formatNumber(violation.limit, context.options.locale)
              : null,
        })),
      };
    }
    if (!catalog.capabilities.checkout) {
      return { kind: "unavailable" };
    }
  }
  return {
    kind: "choose",
    upgrade: role.kind === "plan" && role.index > role.currentIndex,
  };
}

/** The server's standing, which a public plan does not carry. */
function standing(plan: AnyPlan): {
  current: boolean;
  valid: boolean;
  invalidReason: string | null;
  usageViolations: CatalogPlan["usageViolations"];
} {
  if (!("current" in plan)) {
    return {
      current: false,
      valid: true,
      invalidReason: null,
      usageViolations: [],
    };
  }
  return {
    current: plan.current,
    valid: plan.valid,
    invalidReason: plan.invalidReason ?? null,
    usageViolations: plan.usageViolations,
  };
}

function creditLines(
  grants: Grant[],
  entitlements: CatalogEntitlement[],
  locale: string,
): PricingCreditLine[] {
  // A credit granted more than once of a kind sums into one line, in the
  // plan's order. Granted both per license and outright, it reads as the
  // per-license line with the company's share under it.
  const totals = new Map<
    string,
    { grant: Grant; total: number; license: CatalogEntitlement | undefined }
  >();
  for (const grant of grants) {
    const perLicense = grant.scaling === "per_license";
    const key = `${grant.creditId}:${perLicense ? `license:${grant.licenseId ?? ""}` : "company"}`;
    const license = perLicense
      ? entitlements.find(
          (entitlement) =>
            grant.licenseId !== undefined &&
            grant.licenseId !== null &&
            entitlement.licenseId === grant.licenseId,
        )
      : undefined;
    const existing = totals.get(key);
    totals.set(key, {
      grant: existing?.grant ?? grant,
      total: (existing?.total ?? 0) + grant.creditAmount,
      license: existing?.license ?? license,
    });
  }

  const named = (grant: Grant, count: number) =>
    featureName(
      {
        name: grant.creditName,
        singularName: grant.creditSingularName,
        pluralName: grant.creditPluralName,
      },
      count,
      locale,
    );
  const perLicenseCredits = new Set(
    Array.from(totals.entries())
      .filter(([key]) => !key.endsWith(":company"))
      .map(([, { grant }]) => grant.creditId),
  );

  const lines: PricingCreditLine[] = [];
  for (const [key, { grant, total, license }] of totals) {
    const company = key.endsWith(":company");
    if (company && perLicenseCredits.has(grant.creditId)) {
      continue;
    }
    const outright = company
      ? undefined
      : totals.get(`${grant.creditId}:company`);
    lines.push({
      creditId: grant.creditId,
      icon: nonEmpty(grant.creditIcon),
      amount: formatCredits(total, locale),
      creditName: named(grant, total),
      period: resetPeriod(grant.resetCadence),
      perLicense: company
        ? null
        : license === undefined
          ? null
          : featureName(
              {
                name: license.featureName,
                singularName: license.featureSingularName,
                pluralName: license.featurePluralName,
              },
              1,
              locale,
            ),
      plus:
        outright === undefined
          ? null
          : {
              amount: formatCredits(outright.total, locale),
              creditName: named(outright.grant, outright.total),
              period: resetPeriod(outright.grant.resetCadence),
            },
    });
  }
  return lines;
}

function entitlementRow(
  entitlement: CatalogEntitlement,
  context: CardContext,
  period: PricingPeriod | null,
  grants: Grant[],
): PricingEntitlementRow {
  const { currency, options } = context;
  const { locale } = options;
  const feature = {
    name: entitlement.featureName,
    singularName: entitlement.featureSingularName,
    pluralName: entitlement.featurePluralName,
  };
  const behavior = entitlement.priceBehavior ?? null;
  const price = meteredPrice(entitlement, currency, period);
  const tiered =
    behavior === "tier" ||
    (behavior === "pay_in_advance" && isTieredPrice(price));
  const size = price === undefined ? 1 : price.packageSize;
  const perUnit = (): {
    cost: string;
    size: string | null;
    units: string;
  } | null =>
    price === undefined
      ? null
      : {
          cost: formatCurrency(amountOf(price), price.currency, locale),
          size: size > 1 ? formatNumber(size, locale) : null,
          units: featureName(feature, size, locale),
        };

  let text: PricingEntitlementText = {
    kind: "name",
    name: entitlement.featureName,
  };
  const unitPrice = perUnit();
  if (
    (behavior === "pay_in_advance" || behavior === "pay_as_you_go") &&
    !tiered &&
    unitPrice !== null
  ) {
    text = {
      kind: "perUnit",
      ...unitPrice,
      period: behavior === "pay_in_advance" ? period : null,
    };
  } else if (tiered) {
    text = { kind: "name", name: entitlement.featureName };
  } else if (
    behavior === "credit_burndown" &&
    options.showCredits !== false &&
    typeof entitlement.consumptionRate === "number" &&
    nonEmpty(entitlement.creditName) !== null
  ) {
    text = {
      kind: "perUse",
      amount: formatConsumptionRate(entitlement.consumptionRate, locale),
      credits: featureName(
        {
          name: entitlement.creditName ?? "",
          singularName: entitlement.creditSingularName,
          pluralName: entitlement.creditPluralName,
        },
        entitlement.consumptionRate,
        locale,
      ),
      unit: featureName(feature, 1, locale),
    };
  } else if (
    behavior === "credit_burndown" &&
    typeof entitlement.creditEquivalentLimit === "number"
  ) {
    const limit = entitlement.creditEquivalentLimit;
    const grant = grants.find(
      (candidate) => candidate.creditId === entitlement.creditId,
    );
    text = {
      kind: "upTo",
      amount: formatNumber(limit, locale),
      units: featureName(feature, limit, locale),
      period: resetPeriod(grant?.resetCadence),
    };
  } else if (entitlement.valueType === "unlimited" && behavior === null) {
    text = { kind: "unlimited", item: featureName(feature, 0, locale) };
  } else if (
    entitlement.valueType === "numeric" ||
    entitlement.valueType === "unlimited" ||
    entitlement.valueType === "trait"
  ) {
    const limit = entitlementLimit(entitlement, options);
    text = {
      kind: "units",
      amount: limit === null ? "" : formatNumber(limit, locale),
      units: featureName(feature, limit ?? 0, locale),
      period: metricPeriod(entitlement.metricPeriod),
    };
  }

  let detail: PricingEntitlementDetail | null = null;
  if (behavior === "overage" && unitPrice !== null) {
    detail = {
      kind: "overage",
      ...unitPrice,
      period: entitlement.featureType === "trait" ? period : null,
    };
  } else if (tiered) {
    detail = { kind: "tiered" };
  }

  return {
    featureId: entitlement.featureId,
    icon: nonEmpty(entitlement.featureIcon),
    description: nonEmpty(entitlement.featureDescription),
    text,
    detail,
    tiers:
      tiered && price !== undefined
        ? {
            ranges: tierRanges(price),
            currency: price.currency,
            mode: price.tiersMode ?? null,
            period,
            unit: featureName(feature, 1, locale),
          }
        : null,
    hardLimit:
      behavior !== null &&
      behavior !== "credit_burndown" &&
      entitlement.valueType === "numeric" &&
      typeof entitlement.valueNumeric === "number"
        ? {
            amount: formatNumber(entitlement.valueNumeric, locale),
            units: featureName(feature, entitlement.valueNumeric, locale),
          }
        : null,
    source: entitlement,
  };
}

/**
 * The number shown: the warning threshold when asked for, the soft limit
 * for overage, else the value.
 */
function entitlementLimit(
  entitlement: CatalogEntitlement,
  options: DerivePricingTableOptions,
): number | null {
  if (
    options.showWarningThresholdAsLimit === true &&
    typeof entitlement.warningThreshold === "number"
  ) {
    return entitlement.warningThreshold;
  }
  if (
    entitlement.priceBehavior === "overage" &&
    typeof entitlement.softLimit === "number"
  ) {
    return entitlement.softLimit;
  }
  return typeof entitlement.valueNumeric === "number"
    ? entitlement.valueNumeric
    : null;
}

/** The plan's price in a currency and period, or its one-time price. */
function planPrice(
  plan: AnyPlan,
  currency: string,
  period: PricingPeriod | "oneTime" | null,
): Price | undefined {
  if (period === null) {
    return undefined;
  }
  const prices = plan.currencyPrices.find(
    (candidate) => candidate.currency.toLowerCase() === currency,
  );
  const key = PRICE_KEY[period];
  return prices?.[key] ?? undefined;
}

const PRICE_KEY = {
  month: "monthlyPrice",
  quarter: "quarterlyPrice",
  year: "yearlyPrice",
  oneTime: "oneTimePrice",
} as const;

const METERED_KEY = {
  month: "meteredMonthlyPrice",
  quarter: "meteredQuarterlyPrice",
  year: "meteredYearlyPrice",
} as const;

/** An entitlement's price in a currency and period, monthly for one-time. */
function meteredPrice(
  entitlement: CatalogEntitlement,
  currency: string,
  period: PricingPeriod | null,
): Price | undefined {
  const key = PRICE_KEY[period ?? "month"];
  const prices = entitlement.currencyPrices.find(
    (candidate) => candidate.currency.toLowerCase() === currency,
  );
  if (prices !== undefined) {
    return prices[key] ?? undefined;
  }
  // An entitlement priced in one currency carries it only on these.
  const metered = entitlement[METERED_KEY[period ?? "month"]];
  return metered !== undefined && metered.currency.toLowerCase() === currency
    ? metered
    : undefined;
}

/**
 * Minor units, the provider's decimal where it has one. The catalog writes
 * "0" beside a whole price for a decimal that was never set.
 */
function amountOf(price: Price): number {
  if (price.priceDecimal !== undefined && price.priceDecimal !== null) {
    const decimal = Number(price.priceDecimal);
    if (Number.isFinite(decimal) && decimal !== 0) {
      return decimal;
    }
  }
  return price.price;
}

function isOneTime(plan: AnyPlan): boolean {
  return plan.chargeType === "one_time";
}

function periodsOf(plan: AnyPlan): PricingPeriod[] {
  return plan.availablePeriods.flatMap((cadence) => {
    const period = CADENCE_PERIOD[cadence];
    return period === undefined ? [] : [period];
  });
}

/**
 * Priced in the currency, or priced in none: a free plan has no prices to
 * be missing one.
 */
function supportsCurrency(plan: AnyPlan, currency: string): boolean {
  return (
    plan.currencyPrices.length === 0 ||
    plan.currencyPrices.some(
      (prices) => prices.currency.toLowerCase() === currency,
    )
  );
}

function asPeriod(value: string | null | undefined): PricingPeriod | null {
  return value === "month" || value === "quarter" || value === "year"
    ? value
    : null;
}

const RESET_PERIOD: Record<string, string> = {
  daily: "day",
  weekly: "week",
  monthly: "month",
  yearly: "year",
};

function resetPeriod(cadence: string | null | undefined): string | null {
  return cadence === undefined || cadence === null
    ? null
    : (RESET_PERIOD[cadence] ?? null);
}

const METRIC_PERIOD: Record<string, string> = {
  current_day: "day",
  current_week: "week",
  current_month: "month",
};

function metricPeriod(period: string | null | undefined): string | null {
  return period === undefined || period === null
    ? null
    : (METRIC_PERIOD[period] ?? null);
}

function trialDaysLeft(
  company: Company | undefined,
  options: DerivePricingTableOptions,
): { count: number; days: string } | null {
  const subscription = company?.subscription;
  const trialEnd = subscription?.trialEnd;
  if (
    subscription?.status !== "trialing" ||
    trialEnd === undefined ||
    trialEnd === null ||
    Number.isNaN(trialEnd.getTime())
  ) {
    return null;
  }
  const now = options.now ?? new Date();
  const days = Math.ceil((trialEnd.getTime() - now.getTime()) / 86_400_000);
  return days > 0
    ? { count: days, days: formatNumber(days, options.locale) }
    : null;
}

/** The asked-for value if offered, else the first preference offered, else the first. */
function pick<T>(
  offered: readonly T[],
  asked: T | undefined,
  preferences: (T | null | undefined)[],
): T | undefined {
  if (asked !== undefined && offered.includes(asked)) {
    return asked;
  }
  for (const preference of preferences) {
    if (
      preference !== undefined &&
      preference !== null &&
      offered.includes(preference)
    ) {
      return preference;
    }
  }
  return offered[0];
}

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

function nonEmpty(value: string | null | undefined): string | null {
  return value === undefined || value === null || value === "" ? null : value;
}
