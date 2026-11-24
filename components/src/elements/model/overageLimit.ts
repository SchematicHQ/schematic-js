import type {
  CreditBalanceEntry,
  CreditOverdraft,
  OverageCredit,
} from "@schematichq/schematic-react";

import {
  featureName,
  formatCredits,
  formatCurrency,
  formatDate,
  resolveLocale,
  usableDate,
} from "./format";

/**
 * `deriveOverageLimit`: one credit's overage limit as the card shows it,
 * with credits, money and dates formatted here. The wording is the
 * element's, keyed by `tone`, `source` and the input's `error`.
 */

export type OverageLimitTone = "ok" | "warning" | "blocked";

/** Who set the limit in force, as the card words it. */
export type OverageLimitSource =
  "planDefault" | "plan" | "company" | "provider";

export type OverageAmount = {
  amount: string;
  /** The credit's name for `amount`: "AI credit" or "AI credits". */
  units: string;
  /** What `amount` costs in the plan's currency; `null` without a rate. */
  money: string | null;
};

export interface OverageLimitView {
  creditId: string;
  name: string;
  /** One extra credit's price, "$0.02"; `null` without a rate. */
  rate: string | null;
  /** The credit's singular name, to follow `rate`. */
  unit: string;
  /** The credit's plural name, beside the input. */
  units: string;
  /** The limit in force; `null` is no limit. */
  limit: OverageAmount | null;
  limitValue: number | null;
  source: OverageLimitSource;
  /** `allowEdit`, and the plan lets the company set its own limit. */
  editable: boolean;
  /** `editable`, and the maximum leaves room above what is used. */
  canRaise: boolean;
  /** The plan sets the limit and the company cannot change it. */
  planLocked: boolean;
  used: OverageAmount;
  hasUsage: boolean;
  /** Credits before the limit, never below zero; `null` without a limit. */
  left: string | null;
  /** Used of the limit, 0 to 100; 0 without a limit. */
  percent: number;
  tone: OverageLimitTone;
  /** The plan's own limit, for "Use plan default"; `null` is no limit. */
  planDefault: OverageAmount | null;
  /** The highest limit the company may set; `null` is no maximum. */
  max: OverageAmount | null;
  maxValue: number | null;
  /** `max` is a cap the provider set for this company, not the plan's. */
  maxFromProvider: boolean;
  /** The company has a limit of its own, so reset has somewhere to go. */
  canReset: boolean;
  /** "Dec 13", when the balance resets; `null` when it does not. */
  resetsOn: string | null;
}

export interface DeriveOverageLimitOptions {
  locale: string;
  /** Default true. */
  allowEdit?: boolean;
  /** Percent of the limit used that turns the card amber. Default 80. */
  warnAt?: number;
}

export const OVERAGE_LIMIT_WARN_AT = 80;

export function deriveOverageLimit(
  { balance, overdraft }: OverageCredit,
  options: DeriveOverageLimitOptions,
): OverageLimitView {
  const { locale } = options;
  const warnAt = options.warnAt ?? OVERAGE_LIMIT_WARN_AT;
  const rate = ratePerCredit(overdraft);
  const credits = (value: number) =>
    overageAmount(value, balance, overdraft, locale);

  const limitValue = orNull(overdraft.overdraftLimit);
  const planDefaultValue = orNull(overdraft.planDefaultLimit);
  const maxValue = orNull(overdraft.maxLimit);
  const adminValue = orNull(overdraft.adminLimit);
  const debt = Math.max(0, overdraft.debt);
  const fraction =
    limitValue === null || limitValue <= 0 ? 0 : Math.min(1, debt / limitValue);
  const blocked = limitValue !== null && debt > 0 && debt >= limitValue;
  const editable = (options.allowEdit ?? true) && overdraft.canChangeLimit;

  let tone: OverageLimitTone = "ok";
  if (blocked) {
    tone = "blocked";
  } else if (fraction > 0 && fraction * 100 >= warnAt) {
    tone = "warning";
  }

  const resetsAt = usableDate(balance.resetsAt);

  return {
    creditId: balance.creditId,
    name: balance.creditName,
    rate:
      rate === null || !hasCurrency(overdraft)
        ? null
        : formatCurrency(rate, overdraft.currency, locale),
    unit: featureName(unitOf(balance), 1, locale),
    units: featureName(unitOf(balance), 2, locale),
    limit: limitValue === null ? null : credits(limitValue),
    limitValue,
    source: limitSource(overdraft),
    editable,
    canRaise: editable && (maxValue === null || maxValue > debt),
    planLocked: !overdraft.canChangeLimit,
    used: credits(debt),
    hasUsage: debt > 0,
    left:
      limitValue === null
        ? null
        : formatCredits(Math.max(0, limitValue - debt), locale),
    percent: Math.round(fraction * 100),
    tone,
    planDefault: planDefaultValue === null ? null : credits(planDefaultValue),
    max: maxValue === null ? null : credits(maxValue),
    maxValue,
    maxFromProvider: adminValue !== null && maxValue === adminValue,
    canReset: editable && orNull(overdraft.companyLimit) !== null,
    resetsOn:
      resetsAt === undefined
        ? null
        : formatDate(resetsAt, locale, { month: "short", year: undefined }),
  };
}

function limitSource(overdraft: CreditOverdraft): OverageLimitSource {
  switch (overdraft.limitSource) {
    case "admin":
      return "provider";
    case "company":
      return "company";
    default:
      return overdraft.canChangeLimit ? "planDefault" : "plan";
  }
}

/** What `value` credits come to at the credit's rate; `null` without one. */
export function overageMoney(
  value: number,
  overdraft: CreditOverdraft,
  locale: string,
): string | null {
  const rate = ratePerCredit(overdraft);
  if (rate === null || !hasCurrency(overdraft)) {
    return null;
  }
  return formatCurrency(value * rate, overdraft.currency, locale, {
    preserveSubUnitPrecision: false,
  });
}

export type OverageLimitInputError = "invalid" | "aboveMax";

export type OverageLimitInput =
  | { value: number; error?: undefined }
  | { error: OverageLimitInputError; value?: undefined };

/**
 * The limit typed into the form, read as the locale writes numbers ("2,000"
 * in English, "2.000" in German). It must be above zero and at most the
 * plan's maximum; the server refuses anything else.
 */
export function validateOverageLimit(
  text: string,
  overdraft: CreditOverdraft,
  locale: string,
): OverageLimitInput {
  const value = parseCredits(text, locale);
  if (value === null || value <= 0) {
    return { error: "invalid" };
  }
  const max = orNull(overdraft.maxLimit);
  if (max !== null && value > max) {
    return { error: "aboveMax" };
  }
  return { value };
}

/** The input's starting text: the limit in force, or empty for no limit. */
export function overageLimitInputText(
  overdraft: CreditOverdraft,
  locale: string,
): string {
  const limit = orNull(overdraft.overdraftLimit);
  return limit === null ? "" : formatCredits(limit, locale);
}

export function parseCredits(text: string, locale: string): number | null {
  const parts = new Intl.NumberFormat(resolveLocale(locale)).formatToParts(
    11111.1,
  );
  const group = parts.find((part) => part.type === "group")?.value ?? ",";
  const decimal = parts.find((part) => part.type === "decimal")?.value ?? ".";
  const normalized = text
    .split(group)
    .join("")
    .replace(/\s/g, "")
    .replace(decimal, ".");
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    return null;
  }
  return Number(normalized);
}

function overageAmount(
  value: number,
  balance: CreditBalanceEntry,
  overdraft: CreditOverdraft,
  locale: string,
): OverageAmount {
  return {
    amount: formatCredits(value, locale),
    units: featureName(unitOf(balance), value, locale),
    money: overageMoney(value, overdraft, locale),
  };
}

/** Minor units per credit; the decimal carries rates finer than one. */
function ratePerCredit(overdraft: CreditOverdraft): number | null {
  const decimal = overdraft.postpaidRatePerUnitDecimal;
  if (decimal !== undefined && decimal !== null && decimal !== "") {
    const parsed = Number(decimal);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  const rate = overdraft.postpaidRatePerUnit;
  return rate === undefined || rate === null ? null : rate;
}

function hasCurrency(
  overdraft: CreditOverdraft,
): overdraft is CreditOverdraft & { currency: string } {
  return overdraft.currency !== undefined && overdraft.currency !== null;
}

function unitOf(balance: CreditBalanceEntry) {
  return {
    name: balance.creditName,
    singularName: balance.creditSingularName,
    pluralName: balance.creditPluralName,
  };
}

function orNull(value: number | null | undefined): number | null {
  return value === undefined || value === null ? null : value;
}
