import type {
  CreditBalanceEntry,
  CreditSpendPolicy,
} from "@schematichq/schematic-react";

import {
  featureName,
  formatCredits,
  resolveLocale,
  usableDate,
} from "./format";

export type BalanceBadgeTone = "ok" | "warning" | "blocked";

/** The window a cap counts over, as the badge words it. */
export type BalanceBadgePeriod = "hourly" | "daily" | "weekly" | "monthly";

export interface BalanceBadgeCap {
  id: string;
  scope: "company" | "user";
  period: BalanceBadgePeriod;
  limit: string;
  consumed: string;
  /** Spent over limit, 0 to 1. */
  fraction: number;
  resetsAt: Date | null;
}

export interface BalanceBadgeView {
  creditId: string;
  name: string;
  /** What is left, formatted, and the credit's name for that amount. */
  remaining: { amount: string; units: string };
  total: string;
  tone: BalanceBadgeTone;
  /** Whether the balance or a cap set `tone`, `percent` and `resetsAt`. */
  constraint: { kind: "balance" } | { kind: "cap"; cap: BalanceBadgeCap };
  /** Used, 0 to 100, of whichever constraint is tightest. */
  percent: number;
  /** When the tightest constraint resets; `null` when it never does. */
  resetsAt: Date | null;
  /** When the balance itself resets, for the tooltip. */
  balanceResetsAt: Date | null;
  /** Window caps on the credit, tightest first. */
  caps: BalanceBadgeCap[];
  /** The smallest per-use cap; `null` when there is none. */
  perUse: { amount: string; units: string } | null;
  source: CreditBalanceEntry;
}

export interface DeriveBalanceBadgeOptions {
  locale: string;
  /** The credit to show; the company's only credit when absent. */
  creditId?: string;
  /** The live spendable balance from the DataStream, when it has one. */
  liveRemaining?: number;
  /** Spend policies from the DataStream that bind the viewer. */
  policies?: readonly CreditSpendPolicy[];
  /** Percent used that turns the badge amber. Default 80. */
  warnAt?: number;
}

export const BALANCE_BADGE_WARN_AT = 80;

/** `undefined` when there is nothing to show. */
export function pickBadgeCredit(
  balances: CreditBalanceEntry[],
  creditId?: string,
): CreditBalanceEntry | undefined {
  if (creditId !== undefined) {
    return balances.find((balance) => balance.creditId === creditId);
  }
  const held = balances.filter(isHeld);
  return held.length === 1 ? held[0] : undefined;
}

/** A credit the plan draws on but the company holds no grant of is not held. */
function isHeld(balance: CreditBalanceEntry): boolean {
  return balance.grants.length > 0 || balance.total > 0;
}

export function deriveBalanceBadge(
  balances: CreditBalanceEntry[],
  options: DeriveBalanceBadgeOptions,
): BalanceBadgeView | null {
  const balance = pickBadgeCredit(balances, options.creditId);
  if (balance === undefined || !isHeld(balance)) {
    return null;
  }
  const { locale } = options;
  const warnAt = options.warnAt ?? BALANCE_BADGE_WARN_AT;
  const remaining = Math.max(0, options.liveRemaining ?? balance.remaining);
  const balanceFraction =
    balance.total > 0
      ? clamp((balance.total - remaining) / balance.total)
      : remaining > 0
        ? 0
        : 1;

  const policies = (options.policies ?? []).filter(
    (policy) => policy.creditId === balance.creditId && policy.limit > 0,
  );
  const caps = policies
    .flatMap((policy) => {
      const cap = windowCap(policy, locale);
      return cap === null ? [] : [cap];
    })
    .sort((a, b) => b.fraction - a.fraction);
  const perUseLimits = policies
    .filter((policy) => policy.kind === "per_draw")
    .map((policy) => policy.limit);

  const tightest = caps[0];
  const capWins =
    tightest !== undefined &&
    tightest.fraction > balanceFraction &&
    tightest.fraction * 100 >= warnAt;
  const fraction = capWins ? tightest.fraction : balanceFraction;
  const balanceResetsAt = usableDate(balance.resetsAt) ?? null;

  return {
    creditId: balance.creditId,
    name: balance.creditName,
    remaining: {
      amount: formatCredits(remaining, locale),
      units: featureName(unitOf(balance), remaining, locale),
    },
    total: formatCredits(balance.total, locale),
    tone:
      fraction >= 1 ? "blocked" : fraction * 100 >= warnAt ? "warning" : "ok",
    constraint: capWins ? { kind: "cap", cap: tightest } : { kind: "balance" },
    percent: Math.round(fraction * 100),
    resetsAt: capWins ? tightest.resetsAt : balanceResetsAt,
    balanceResetsAt,
    caps,
    perUse: perUseOf(balance, perUseLimits, locale),
    source: balance,
  };
}

export function creditUnits(
  balance: CreditBalanceEntry,
  count: number,
  locale: string,
): string {
  return featureName(unitOf(balance), count, locale);
}

function perUseOf(
  balance: CreditBalanceEntry,
  limits: number[],
  locale: string,
): BalanceBadgeView["perUse"] {
  if (limits.length === 0) {
    return null;
  }
  const limit = Math.min(...limits);
  return {
    amount: formatCredits(limit, locale),
    units: creditUnits(balance, limit, locale),
  };
}

function unitOf(balance: CreditBalanceEntry) {
  return {
    name: balance.creditName,
    singularName: balance.creditSingularName,
    pluralName: balance.creditPluralName,
  };
}

const PERIODS: Record<string, BalanceBadgePeriod> = {
  hour: "hourly",
  day: "daily",
  week: "weekly",
  month: "monthly",
  // A company's billing period reads as monthly, as UsageControls shows it.
  billing_period: "monthly",
};

function windowCap(
  policy: CreditSpendPolicy,
  locale: string,
): BalanceBadgeCap | null {
  const period =
    policy.kind === "window" && policy.window !== undefined
      ? PERIODS[policy.window.unit]
      : undefined;
  const scope =
    policy.scope === "company"
      ? "company"
      : policy.scope === "user"
        ? "user"
        : undefined;
  if (period === undefined || scope === undefined) {
    return null;
  }
  return {
    id: policy.id,
    scope,
    period,
    limit: formatCredits(policy.limit, locale),
    consumed: formatCredits(policy.consumed, locale),
    fraction: clamp(policy.consumed / policy.limit),
    resetsAt: usableDate(policy.resetsAt) ?? null,
  };
}

function clamp(fraction: number): number {
  return Number.isFinite(fraction) ? Math.min(1, Math.max(0, fraction)) : 0;
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export function resetDistance(
  at: Date,
  now: Date,
): { unit: "hour" | "minute"; value: number } | null {
  const ms = at.getTime() - now.getTime();
  if (ms >= DAY) {
    return null;
  }
  if (ms >= HOUR) {
    return { unit: "hour", value: Math.round(ms / HOUR) };
  }
  return { unit: "minute", value: Math.max(1, Math.ceil(ms / 60000)) };
}

export function isWithinDay(at: Date, now: Date): boolean {
  return at.getTime() - now.getTime() < DAY;
}

export function formatResetExact(at: Date, now: Date, locale: string): string {
  if (usableDate(at) === undefined) {
    return "";
  }
  return new Intl.DateTimeFormat(resolveLocale(locale), {
    ...(isWithinDay(at, now) ? {} : { month: "short", day: "numeric" }),
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(at);
}
