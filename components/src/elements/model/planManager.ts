import type {
  Company,
  CreditBalanceEntry,
  CreditGrant,
  FeatureUsage,
} from "@schematichq/schematic-react";

import {
  isTieredPrice,
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
  usableDate,
} from "./format";

/**
 * `derivePlanManager`: the company's plan as the plan manager shows it — a
 * notice about where the subscription is headed, the plan and its price,
 * the add-ons, the usage-based features, and the credits the plan and the
 * company's purchases bring. The wording is the element's, keyed by `kind`;
 * numbers, names and dates are formatted here.
 */

export type PlanNotice =
  | {
      kind: "trial";
      /** Whole days, else hours, minutes or seconds; `null` without an end. */
      endsIn: { amount: number; unit: TrialUnit } | null;
    }
  | {
      kind: "canceled";
      /** The plan's name; `null` when the company has none. */
      planName: string | null;
      /** "October 1, 2026"; `null` without a cancellation date. */
      date: string | null;
    }
  | {
      kind: "customPlanBilling";
      /** The plan activates on payment, rather than ending without it. */
      awaitingActivation: boolean;
      planName: string | null;
      date: string;
      invoiceUrl: string | null;
    }
  | {
      kind: "scheduledDowngrade";
      fromPlanName: string;
      toPlanName: string;
      /** When the current period ends; `null` when it is not known. */
      date: string | null;
    };

export type TrialUnit = "day" | "hour" | "minute" | "second";

export type PlanPrice =
  | { kind: "usageBased" }
  | { kind: "free" }
  | {
      kind: "amount";
      amount: string;
      /** A period key: "month", "quarter", "year"; `null` when free or unknown. */
      period: string | null;
    };

export interface PlanAddOnRow {
  id: string;
  name: string;
  /** `null` when the add-on is not billed. */
  price: {
    amount: string;
    /** A period key, or "one-time". */
    period: string;
  } | null;
}

export interface UsageBasedRow {
  featureId: string;
  name: string;
  /** The limit the feature is shown against; `null` shows the name alone. */
  quantity: { amount: number; units: string } | null;
  /** Overage: the price is for usage past the limit. */
  additional: boolean;
  tierBased: boolean;
  /** Pay-as-you-go and overage: the price of a unit, or of a package. */
  unitPrice: {
    cost: string;
    /** More than one unit to a package; `null` for a single unit. */
    packageSize: number | null;
    units: string;
    /** A period key for a trait-based feature; `null` otherwise. */
    period: string | null;
  } | null;
  /** Credit burndown: credits consumed per use. */
  perUse: { amount: string; units: string } | null;
  /** Paid in advance: what the allocation costs per period. */
  cost: { amount: string; period: string | null } | null;
  tiers: {
    currency: string;
    mode: "graduated" | "volume" | null;
    period: string | null;
    ranges: TierRange[];
    unit: string;
  } | null;
  hardLimit: { amount: number; units: string } | null;
  source: FeatureUsage;
}

export interface PlanCreditRow {
  creditId: string;
  text:
    | {
        kind: "perLicense";
        amount: number;
        creditName: string;
        licenseName: string;
        /** The flat company grant on top, per period; `null` without one. */
        plus: { amount: number; creditName: string; period: string } | null;
      }
    | {
        kind: "total";
        amount: number;
        creditName: string;
        /** A period key; `null` without a subscription. */
        period: string | null;
      };
  /** Credits spent; nothing is shown at 0. */
  used: number;
  /** The tip on the used count when the credit tops itself up. */
  autoTopup: { amount: number; threshold: number } | null;
  /** "12 Seats × 10 = 120 credits/mo". */
  composition: {
    quantity: number;
    licenseName: string;
    perUnit: number;
    /** The flat company grant; `null` without one. */
    fixed: number | null;
    total: number;
    creditName: string;
    /** A period key: "day", "week", "month" or "year". */
    period: string;
  } | null;
}

export type AutoTopupLine =
  | { kind: "disabled"; creditId: string; unit: string }
  | {
      kind: "adds";
      creditId: string;
      amount: number;
      unit: string;
      threshold: number;
    };

/** Grants of one credit from one bundle, or one grant outside a bundle. */
export interface CreditGroupRow {
  key: string;
  /** Live grants in the group. */
  count: number;
  bundleName: string | null;
  /** The newest grant's quantity. */
  quantity: number;
  creditName: string;
  used: number;
}

export interface PlanManagerView {
  notice: PlanNotice | null;
  /** `null` when the company has no plan. */
  plan: {
    name: string;
    description: string | null;
    /** `null` when the plan is not billed. */
    price: PlanPrice | null;
  } | null;
  addOns: PlanAddOnRow[];
  usageBased: UsageBasedRow[];
  planCredits: PlanCreditRow[];
  /** The self-service auto top-up box; `null` when no plan credit offers it. */
  autoTopup: { lines: AutoTopupLine[] } | null;
  topUps: CreditGroupRow[];
  bundles: CreditGroupRow[];
  promotional: CreditGroupRow[];
  /** A custom plan awaiting payment to activate has no plan to change yet. */
  canChangePlan: boolean;
}

export interface DerivePlanManagerOptions extends UsageLimitOptions {
  locale: string;
  /** What "Trial ends in" counts down from. Default now. */
  now?: Date;
  /** Credit-burning features' "credits per use". Default true. */
  showCredits?: boolean;
  /** A plan priced at zero reads "Free". Default false. */
  showZeroPriceAsFree?: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

export function derivePlanManager(
  data: {
    company: Company;
    creditBalances: CreditBalanceEntry[];
    featureUsage: FeatureUsage[];
  },
  options: DerivePlanManagerOptions,
): PlanManagerView {
  const { company, creditBalances, featureUsage } = data;
  const { locale } = options;
  const subscription = company.subscription ?? null;
  const currency = subscription?.currency ?? "usd";
  // The period the company is billed in, else the plan's own.
  const planPeriod = subscription?.period ?? company.plan?.period ?? null;
  const usageBasedSources = featureUsage.filter(
    (row) => typeof row.priceBehavior === "string",
  );

  return {
    notice: notice(company, options),
    plan:
      company.plan === undefined || company.plan === null
        ? null
        : {
            name: company.plan.name,
            description: orNull(company.plan.description),
            price: planPrice(
              company.plan.price,
              planPeriod,
              currency,
              usageBasedSources.length > 0,
              options,
            ),
          },
    addOns: company.addOns.map((addOn) => {
      const period =
        addOn.period === "one-time"
          ? "one-time"
          : (planPeriod ?? addOn.period ?? null);
      return {
        id: addOn.id,
        name: addOn.name,
        price:
          typeof addOn.price === "number" && period !== null
            ? {
                amount: formatCurrency(addOn.price, currency, locale),
                period,
              }
            : null,
      };
    }),
    usageBased: usageBasedSources.flatMap((row) => {
      const derived = usageBasedRow(row, planPeriod ?? "month", options);
      return derived === null ? [] : [derived];
    }),
    planCredits: planCredits(company, creditBalances, locale),
    autoTopup: autoTopupBox(company, creditBalances, locale),
    ...creditGroups(creditBalances, locale),
    canChangePlan:
      company.customPlanBilling?.activationStrategy !== "on_payment",
  };
}

/**
 * At most one, in the embed's order: a trial that is not cancelling, then a
 * cancellation, then a custom plan billing, then a scheduled downgrade.
 */
function notice(
  company: Company,
  options: DerivePlanManagerOptions,
): PlanNotice | null {
  const { locale } = options;
  const subscription = company.subscription ?? null;
  const cancelAt = usableDate(subscription?.cancelAt);
  // Both, as the embed reads it: a cancellation date alone is not a
  // scheduled cancellation.
  const willCancel =
    cancelAt !== undefined && subscription?.cancelAtPeriodEnd === true;

  if (subscription?.status === "trialing" && !willCancel) {
    const trialEnd = usableDate(subscription.trialEnd);
    return {
      kind: "trial",
      endsIn:
        trialEnd === undefined
          ? null
          : countdown(
              trialEnd.getTime() - (options.now ?? new Date()).getTime(),
            ),
    };
  }
  if (willCancel) {
    return {
      kind: "canceled",
      planName: orNull(company.plan?.name),
      date: formatDate(cancelAt, locale),
    };
  }
  const billing = company.customPlanBilling;
  if (billing !== undefined && billing !== null) {
    return {
      kind: "customPlanBilling",
      awaitingActivation: billing.activationStrategy === "on_payment",
      planName: orNull(billing.planName),
      date: formatDate(billing.dueAt, locale),
      invoiceUrl: orNull(billing.invoiceUrl),
    };
  }
  const downgrade = company.scheduledDowngrade;
  if (
    downgrade !== undefined &&
    downgrade !== null &&
    downgrade.toPlanName !== ""
  ) {
    const periodEnd = usableDate(subscription?.periodEnd);
    return {
      kind: "scheduledDowngrade",
      fromPlanName: downgrade.fromPlanName,
      toPlanName: downgrade.toPlanName,
      date: periodEnd === undefined ? null : formatDate(periodEnd, locale),
    };
  }
  return null;
}

/** The largest whole unit, as the embed counts a trial down. */
function countdown(ms: number): { amount: number; unit: TrialUnit } {
  if (ms >= DAY_MS) {
    return { amount: Math.floor(ms / DAY_MS), unit: "day" };
  }
  if (ms >= HOUR_MS) {
    return { amount: Math.floor(ms / HOUR_MS), unit: "hour" };
  }
  if (ms >= MINUTE_MS) {
    return { amount: Math.floor(ms / MINUTE_MS), unit: "minute" };
  }
  return { amount: Math.floor(ms / 1000), unit: "second" };
}

function planPrice(
  price: number | null | undefined,
  period: string | null,
  currency: string,
  hasUsageBased: boolean,
  options: DerivePlanManagerOptions,
): PlanPrice | null {
  if (typeof price !== "number") {
    return null;
  }
  const isFree = price === 0;
  if (isFree && hasUsageBased) {
    return { kind: "usageBased" };
  }
  if (isFree && options.showZeroPriceAsFree === true) {
    return { kind: "free" };
  }
  return {
    kind: "amount",
    amount: formatCurrency(price, currency, options.locale),
    period: isFree ? null : period,
  };
}

function usageBasedRow(
  row: FeatureUsage,
  period: string,
  options: DerivePlanManagerOptions,
): UsageBasedRow | null {
  const { locale } = options;
  const behavior = row.priceBehavior ?? null;
  const showCredits = options.showCredits ?? true;
  if (
    (behavior === "credit_burndown" && !showCredits) ||
    row.featureName === ""
  ) {
    return null;
  }

  const unit = {
    name: row.featureName,
    singularName: row.featureSingularName ?? undefined,
    pluralName: row.featurePluralName ?? undefined,
  };
  const isTrait = row.featureType === "trait";
  const price = row.price ?? undefined;
  const priceCurrency = price?.currency ?? "usd";
  const limit =
    behavior === "credit_burndown" ? null : usageLimit(row, options);

  let unitPriceText: UsageBasedRow["unitPrice"] = null;
  if (
    (behavior === "pay_as_you_go" || behavior === "overage") &&
    price !== undefined
  ) {
    const packageSize = price.packageSize ?? 1;
    // An overage price is tiered, free up to the soft limit: what a unit
    // past it costs is the last tier's.
    const ranges = behavior === "overage" ? tierRanges(price) : [];
    const lastTier = ranges[ranges.length - 1] as TierRange | undefined;
    const amount =
      lastTier === undefined
        ? unitPrice(price)
        : (lastTier.perUnitPrice ?? price.price);
    unitPriceText = {
      cost: formatCurrency(amount, priceCurrency, locale),
      packageSize: packageSize > 1 ? packageSize : null,
      units: featureName(unit, packageSize, locale),
      period: isTrait ? period : null,
    };
  }

  let perUse: UsageBasedRow["perUse"] = null;
  if (
    behavior === "credit_burndown" &&
    typeof row.consumptionRate === "number" &&
    row.consumptionRate !== 0 &&
    typeof row.creditName === "string"
  ) {
    perUse = {
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
  }

  return {
    featureId: row.featureId,
    name: row.featureName,
    // The bare name, inflected, as the embed counts a limit.
    quantity:
      limit === null
        ? null
        : {
            amount: limit,
            units: featureName({ name: row.featureName }, limit, locale),
          },
    additional: behavior === "overage",
    tierBased: behavior === "tier",
    unitPrice: unitPriceText,
    perUse,
    cost:
      behavior === "pay_in_advance"
        ? {
            amount: formatCurrency(row.currentCost ?? 0, priceCurrency, locale),
            period: isTrait ? period : null,
          }
        : null,
    tiers:
      behavior === "tier" && isTieredPrice(price)
        ? {
            currency: priceCurrency,
            mode: price?.tiersMode ?? null,
            period,
            ranges: tierRanges(price),
            unit: row.featureSingularName ?? row.featureName,
          }
        : null,
    hardLimit:
      behavior !== null &&
      behavior !== "credit_burndown" &&
      row.valueType === "numeric" &&
      typeof row.allocation === "number"
        ? {
            amount: row.allocation,
            units: featureName(unit, row.allocation, locale),
          }
        : null,
    source: row,
  };
}

/**
 * Each credit the plan grants: the live plan grants of it summed, in the
 * order the plan lists its credits, then any other credit a plan grant
 * brings (an add-on's) in the order its grants arrive.
 */
function planCredits(
  company: Company,
  balances: CreditBalanceEntry[],
  locale: string,
): PlanCreditRow[] {
  const order = company.plan?.includedCreditIds ?? [];
  const rank = (creditId: string) => {
    const index = order.indexOf(creditId);
    return index === -1 ? order.length : index;
  };
  const subscriptionPeriod = company.subscription?.period ?? null;

  return balances
    .flatMap((balance) => {
      const grants = balance.grants.filter(
        (grant) => grant.grantReason === "plan",
      );
      if (grants.length === 0) {
        return [];
      }
      const unit = creditUnit(balance);
      const value = sum(grants, (grant) => grant.quantity);
      const used = sum(grants, (grant) => grant.quantityUsed);
      const composition = balance.composition ?? null;
      const autoTopup = balance.autoTopup ?? null;

      const row: PlanCreditRow = {
        creditId: balance.creditId,
        text:
          composition === null
            ? {
                kind: "total",
                amount: value,
                creditName: featureName(unit, value, locale),
                period: subscriptionPeriod,
              }
            : {
                kind: "perLicense",
                amount: composition.perLicenseAmount,
                creditName: featureName(
                  unit,
                  composition.perLicenseAmount,
                  locale,
                ),
                licenseName: featureName(licenseUnit(composition), 1, locale),
                plus:
                  composition.fixedQuantity > 0
                    ? {
                        amount: composition.fixedQuantity,
                        creditName: featureName(
                          unit,
                          composition.fixedQuantity,
                          locale,
                        ),
                        period: composition.period,
                      }
                    : null,
              },
        used,
        autoTopup:
          autoTopup !== null &&
          autoTopup.enabled &&
          typeof autoTopup.thresholdCredits === "number" &&
          typeof autoTopup.amount === "number"
            ? {
                amount: autoTopup.amount,
                threshold: autoTopup.thresholdCredits,
              }
            : null,
        composition:
          composition === null
            ? null
            : {
                quantity: composition.licenseQuantity,
                licenseName: featureName(
                  licenseUnit(composition),
                  composition.licenseQuantity,
                  locale,
                ),
                perUnit: composition.perLicenseAmount,
                fixed:
                  composition.fixedQuantity > 0
                    ? composition.fixedQuantity
                    : null,
                total: composition.total,
                creditName: featureName(unit, composition.total, locale),
                period: composition.period,
              },
      };
      return [row];
    })
    .map((row, index) => ({ row, index }))
    .sort(
      (a, b) =>
        rank(a.row.creditId) - rank(b.row.creditId) || a.index - b.index,
    )
    .map(({ row }) => row);
}

/**
 * The plan's credits the company may top up itself, in the plan's order:
 * a line each saying what a top-up adds, or that it is off.
 */
function autoTopupBox(
  company: Company,
  balances: CreditBalanceEntry[],
  locale: string,
): PlanManagerView["autoTopup"] {
  const order = company.plan?.includedCreditIds ?? [];
  const selfService = order.flatMap((creditId) => {
    const balance = balances.find((b) => b.creditId === creditId);
    const autoTopup = balance?.autoTopup ?? null;
    return balance === undefined || autoTopup === null || !autoTopup.selfService
      ? []
      : [{ balance, autoTopup }];
  });
  if (selfService.length === 0) {
    return null;
  }
  return {
    lines: selfService.flatMap(({ balance, autoTopup }): AutoTopupLine[] => {
      const unit = creditUnit(balance);
      if (!autoTopup.enabled) {
        return [
          {
            kind: "disabled",
            creditId: balance.creditId,
            unit: featureName(unit, 1, locale),
          },
        ];
      }
      if (
        typeof autoTopup.thresholdCredits !== "number" ||
        typeof autoTopup.amount !== "number"
      ) {
        return [];
      }
      return [
        {
          kind: "adds",
          creditId: balance.creditId,
          amount: autoTopup.amount,
          unit: featureName(unit, autoTopup.amount, locale),
          threshold: autoTopup.thresholdCredits,
        },
      ];
    }),
  };
}

/**
 * The credits the company bought, was topped up with, or was given, a row
 * per bundle (or per grant outside one) and reason, newest first.
 */
function creditGroups(
  balances: CreditBalanceEntry[],
  locale: string,
): Pick<PlanManagerView, "bundles" | "promotional" | "topUps"> {
  const groups = new Map<
    string,
    { balance: CreditBalanceEntry; grants: CreditGrant[] }
  >();
  for (const balance of balances) {
    for (const grant of balance.grants) {
      if (grant.grantReason === "plan") {
        continue;
      }
      const key = `${grant.grantReason}:${grant.bundleId ?? grant.id}`;
      const group = groups.get(key);
      if (group === undefined) {
        groups.set(key, { balance, grants: [grant] });
      } else {
        group.grants.push(grant);
      }
    }
  }

  const rows = Array.from(groups.entries())
    .map(([key, { balance, grants }]) => {
      const sorted = [...grants].sort(byRecency);
      const latest = sorted[0];
      return {
        reason: latest.grantReason,
        createdAt: latest.createdAt,
        row: {
          key,
          count: sorted.length,
          bundleName: orNull(latest.bundleName),
          quantity: latest.quantity,
          creditName: featureName(creditUnit(balance), latest.quantity, locale),
          used: sum(sorted, (grant) => grant.quantityUsed),
        },
      };
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const pick = (reason: string) =>
    rows.filter((entry) => entry.reason === reason).map((entry) => entry.row);
  return {
    bundles: pick("purchased"),
    promotional: pick("free"),
    topUps: pick("billing_credit_auto_topup"),
  };
}

function byRecency(a: CreditGrant, b: CreditGrant): number {
  return b.createdAt.getTime() - a.createdAt.getTime();
}

function creditUnit(balance: CreditBalanceEntry) {
  return {
    name: balance.creditName,
    singularName: balance.creditSingularName ?? undefined,
    pluralName: balance.creditPluralName ?? undefined,
  };
}

function licenseUnit(
  composition: NonNullable<CreditBalanceEntry["composition"]>,
) {
  return {
    name: composition.licenseName,
    singularName: composition.licenseSingularName,
    pluralName: composition.licensePluralName,
  };
}

function sum<T>(items: T[], value: (item: T) => number): number {
  return items.reduce((total, item) => total + value(item), 0);
}

function orNull(value: string | null | undefined): string | null {
  return value === undefined || value === null || value === "" ? null : value;
}
