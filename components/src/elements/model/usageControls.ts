import type {
  Company,
  CreditBalanceEntry,
  SpendPolicy,
  SpendWindowUnit,
} from "@schematichq/schematic-react";

import { featureName, formatCredits, usableDate } from "./format";

/**
 * `deriveUsageControls`: the company's spend policies as rows, ordered and
 * formatted, plus what the add/edit dialog needs to offer only caps the API
 * will accept. Period and status wording is the element's, keyed here.
 */

/** A window as the dialog offers it. Monthly is the plan period for the company, the calendar month for a user. */
export type UsagePeriod = "hour" | "day" | "week" | "month";

/** How the row names its window. `calendarMonth` is a company cap on `month`, which the dialog no longer writes. */
export type UsageRowPeriod = UsagePeriod | "billingPeriod" | "calendarMonth";

export type UsageControlStatus = "ok" | "near" | "reached";

/** `null` userId is the whole company. */
export interface UsageScope {
  creditId: string;
  userId: string | null;
}

export interface UsageControlRow {
  id: string;
  creditId: string;
  /** The credit's plural name, for "500 AI credits"; inflected per amount by `unitName`. */
  creditName: string;
  /** The credit's name inflected for `limit`. */
  unitName: string;
  userId: string | null;
  /** `null` on a company row, and on a user the server could not name. */
  userName: string | null;
  kind: "window" | "perUse";
  /** Set on window rows only. */
  period: UsageRowPeriod | null;
  limit: number;
  limitText: string;
  /** Window rows only; `null` before the server has counted. */
  consumed: number | null;
  consumedText: string | null;
  /** 0–100, for the meter. */
  percent: number;
  status: UsageControlStatus;
  resetsAt: Date | null;
  policy: SpendPolicy;
}

export interface UsageCreditOption {
  id: string;
  name: string;
}

export interface UsageControlsView {
  rows: UsageControlRow[];
  /** The one credit every row and option is in; `null` when there are several. */
  credit: UsageCreditOption | null;
  /** The credits Add can cap: those the company holds, narrowed by `credits`. */
  creditOptions: UsageCreditOption[];
}

export interface DeriveUsageControlsOptions {
  /** Credit ids to keep; every credit when absent or empty. */
  credits?: readonly string[];
  locale: string;
}

/** The API's alert threshold for credit usage, as a fraction. */
export const NEAR_LIMIT = 0.8;

const PERIOD_ORDER: Record<UsageRowPeriod, number> = {
  hour: 0,
  day: 1,
  week: 2,
  month: 3,
  calendarMonth: 3,
  billingPeriod: 4,
};

export function deriveUsageControls(
  policies: readonly SpendPolicy[],
  balances: readonly CreditBalanceEntry[] | undefined,
  { credits, locale }: DeriveUsageControlsOptions,
): UsageControlsView {
  const wanted =
    credits === undefined || credits.length === 0
      ? undefined
      : new Set(credits);
  const keep = (creditId: string) =>
    wanted === undefined || wanted.has(creditId);

  const rows = policies
    .filter((policy) => keep(policy.billingCreditId))
    .map((policy) => policyRow(policy, balances, locale))
    .filter((row): row is UsageControlRow => row !== null)
    .sort(compareRows);

  const creditOptions = (balances ?? [])
    .filter((balance) => keep(balance.creditId))
    .map((balance) => ({
      id: balance.creditId,
      name: featureName(
        {
          name: balance.creditName,
          pluralName: balance.creditPluralName,
          singularName: balance.creditSingularName,
        },
        2,
        locale,
      ),
    }));

  const named = new Map<string, string>();
  for (const option of creditOptions) named.set(option.id, option.name);
  for (const row of rows) named.set(row.creditId, row.creditName);
  const [only] = named;
  return {
    rows,
    credit:
      named.size === 1 && only !== undefined
        ? { id: only[0], name: only[1] }
        : null,
    creditOptions,
  };
}

/**
 * The periods and per-use cap a scope already has, so the dialog disables
 * them: the API keeps one window cap per period and one per-use cap per
 * scope and credit, and answers a second with a 409.
 */
export function takenCaps(
  rows: readonly UsageControlRow[],
  scope: UsageScope,
  exceptId?: string,
): { periods: Set<UsagePeriod>; perUse: boolean } {
  const periods = new Set<UsagePeriod>();
  let perUse = false;
  for (const row of rows) {
    if (
      row.id === exceptId ||
      row.creditId !== scope.creditId ||
      row.userId !== scope.userId
    ) {
      continue;
    }
    if (row.kind === "perUse") {
      perUse = true;
      continue;
    }
    const period = dialogPeriod(row.period);
    if (period !== null) {
      periods.add(period);
    }
  }
  return { periods, perUse };
}

/**
 * The API's window for a dialog period. `billing_period` is company-only, so
 * a user's Monthly is the calendar month.
 */
export function windowUnitFor(
  period: UsagePeriod,
  userId: string | null,
): SpendWindowUnit {
  if (period !== "month") {
    return period;
  }
  return userId === null ? "billing_period" : "month";
}

/**
 * When a cap created now would first reset. Windows run on UTC: an hour or
 * day from its start, a week from Monday, a month from the 1st. A company
 * Monthly cap follows the plan period, falling back to the calendar month
 * without a subscription, as the API does.
 */
export function nextReset(
  period: UsagePeriod,
  userId: string | null,
  company: Company | undefined,
  now: Date,
): Date {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const d = now.getUTCDate();
  switch (period) {
    case "hour":
      return new Date(Date.UTC(y, m, d, now.getUTCHours() + 1));
    case "day":
      return new Date(Date.UTC(y, m, d + 1));
    case "week": {
      const sinceMonday = (now.getUTCDay() + 6) % 7;
      return new Date(Date.UTC(y, m, d - sinceMonday + 7));
    }
    case "month": {
      const periodEnd = usableDate(company?.subscription?.periodEnd);
      if (userId === null && periodEnd !== undefined && periodEnd > now) {
        return periodEnd;
      }
      return new Date(Date.UTC(y, m + 1, 1));
    }
  }
}

function policyRow(
  policy: SpendPolicy,
  balances: readonly CreditBalanceEntry[] | undefined,
  locale: string,
): UsageControlRow | null {
  const perUse = policy.maxPerDraw != null;
  const limit = perUse ? policy.maxPerDraw : policy.windowAmount;
  if (limit == null) {
    return null;
  }
  const named = creditNames(policy, balances);
  const consumed = perUse ? null : (policy.consumed ?? null);
  const fraction = consumed === null || limit <= 0 ? 0 : consumed / limit;
  return {
    id: policy.id,
    creditId: policy.billingCreditId,
    creditName: featureName(named, 2, locale),
    unitName: featureName(named, limit, locale),
    userId: policy.scopeType === "user" ? (policy.userId ?? null) : null,
    userName: policy.user?.name ?? null,
    kind: perUse ? "perUse" : "window",
    period: perUse ? null : rowPeriod(policy),
    limit,
    limitText: formatCredits(limit, locale),
    consumed,
    consumedText: consumed === null ? null : formatCredits(consumed, locale),
    percent: Math.min(100, Math.max(0, fraction * 100)),
    status:
      consumed === null
        ? "ok"
        : fraction >= 1
          ? "reached"
          : fraction >= NEAR_LIMIT
            ? "near"
            : "ok",
    resetsAt: perUse ? null : (usableDate(policy.resetsAt) ?? null),
    policy,
  };
}

/** The embedded credit, else the balance, else the id: a row is never nameless. */
function creditNames(
  policy: SpendPolicy,
  balances: readonly CreditBalanceEntry[] | undefined,
): { name: string; pluralName?: string | null; singularName?: string | null } {
  if (policy.credit != null) {
    return policy.credit;
  }
  const balance = balances?.find((b) => b.creditId === policy.billingCreditId);
  return balance === undefined
    ? { name: policy.billingCreditId }
    : {
        name: balance.creditName,
        pluralName: balance.creditPluralName,
        singularName: balance.creditSingularName,
      };
}

function rowPeriod(policy: SpendPolicy): UsageRowPeriod | null {
  switch (policy.windowUnit) {
    case "hour":
    case "day":
    case "week":
      return policy.windowUnit;
    case "month":
      return policy.scopeType === "user" ? "month" : "calendarMonth";
    case "billing_period":
      return "billingPeriod";
    default:
      return null;
  }
}

/** The dialog period a row occupies; a company `month` row occupies none it offers. */
function dialogPeriod(period: UsageRowPeriod | null): UsagePeriod | null {
  switch (period) {
    case "billingPeriod":
      return "month";
    case "calendarMonth":
    case null:
      return null;
    default:
      return period;
  }
}

/** Company first, then users by name; shortest window first, per-use last. */
function compareRows(a: UsageControlRow, b: UsageControlRow): number {
  if ((a.userId === null) !== (b.userId === null)) {
    return a.userId === null ? -1 : 1;
  }
  const byUser = (a.userName ?? a.userId ?? "").localeCompare(
    b.userName ?? b.userId ?? "",
  );
  if (byUser !== 0) {
    return byUser;
  }
  const byCredit = a.creditName.localeCompare(b.creditName);
  if (byCredit !== 0) {
    return byCredit;
  }
  return rank(a) - rank(b);
}

function rank(row: UsageControlRow): number {
  return row.period === null ? 5 : PERIOD_ORDER[row.period];
}
