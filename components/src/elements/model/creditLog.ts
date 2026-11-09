import type {
  CreditLedgerEntry,
  CreditLedgerPage,
} from "@schematichq/schematic-react";

import {
  featureName,
  formatCredits,
  formatDateTime,
  usableDate,
} from "./format";

/**
 * `deriveCreditLog`: a page of the company's credit ledger as the log shows
 * it, with amounts, units and times formatted here. The wording is the
 * element's, keyed by `action` and `who`.
 */

/** What a row is, in the log's words. */
export type CreditLogKind = "draw" | "reversal" | "grant" | "topup" | "expiry";

/** What happened, keyed for copy; `subject` names the feature or bundle. */
export type CreditLogAction =
  | "usage"
  | "refund"
  | "usageAdjustment"
  | "autoTopup"
  | "purchase"
  | "planGrant"
  | "freeGrant"
  | "adjustmentGrant"
  | "rollover"
  | "expired"
  | "reset"
  | "planChange"
  | "licenseRetired"
  | "removed";

/** Who a row is attributed to: a user, or where the credits came from. */
export type CreditLogWho =
  | { kind: "user"; name: string }
  | { kind: "autoTopup" | "purchase" | "plan" | "manual" };

export interface CreditLogRow {
  id: string;
  kind: CreditLogKind;
  action: CreditLogAction;
  /** The feature a draw was for, or the bundle a top-up came from. */
  subject: string | null;
  /** `null` for a draw sent without a user. */
  who: CreditLogWho | null;
  /** Signed: negative takes from the balance. */
  amount: number;
  /** Absolute, to ten fraction digits; `positive` carries the sign. */
  amountText: string;
  positive: boolean;
  /** The credit's name for `amount`: "AI credit" or "AI credits". */
  unit: string;
  creditId: string;
  /** The credit's plural name, to label the row: "AI credits". */
  creditName: string;
  /** `null` for an Invalid Date. */
  at: Date | null;
  /** Today or yesterday in the viewer's time zone, else `null`. */
  day: "today" | "yesterday" | null;
  /** "Oct 26, 3:40 PM", or the time alone when `day` is set. */
  whenText: string;
  source: CreditLedgerEntry;
}

export interface CreditLogView {
  rows: CreditLogRow[];
  /**
   * The one credit every row is in, with its plural name: "AI credits".
   * `null` for an empty log, or one that spans several credits.
   */
  credit: { id: string; name: string } | null;
  hasMore: boolean;
}

export interface DeriveCreditLogOptions {
  locale: string;
  /** What "today" is judged against. Default the current time. */
  now?: Date;
}

export function deriveCreditLog(
  page: CreditLedgerPage,
  options: DeriveCreditLogOptions,
): CreditLogView {
  const now = options.now ?? new Date();
  const rows = page.entries.map((entry) => logRow(entry, options.locale, now));
  const first = rows[0]?.source.credit;
  const single =
    first !== undefined && rows.every((row) => row.creditId === first.id);
  return {
    rows,
    credit: single
      ? { id: first.id, name: featureName(first, 2, options.locale) }
      : null,
    hasMore: page.hasMore,
  };
}

function logRow(
  entry: CreditLedgerEntry,
  locale: string,
  now: Date,
): CreditLogRow {
  const at = usableDate(entry.eventAt) ?? null;
  const day = at === null ? null : relativeDay(at, now);
  const { kind, action, subject, who } = describe(entry);
  const magnitude = Math.abs(entry.amount);
  return {
    id: entry.id,
    kind,
    action,
    subject,
    who,
    amount: entry.amount,
    amountText: formatCredits(magnitude, locale),
    positive: entry.amount > 0,
    unit: featureName(
      {
        name: entry.credit.name,
        singularName: entry.credit.singularName,
        pluralName: entry.credit.pluralName,
      },
      magnitude,
      locale,
    ),
    creditId: entry.credit.id,
    creditName: featureName(entry.credit, 2, locale),
    at,
    day,
    whenText:
      at === null ? "" : formatDateTime(at, locale, { timeOnly: day !== null }),
    source: entry,
  };
}

function describe(
  entry: CreditLedgerEntry,
): Pick<CreditLogRow, "kind" | "action" | "subject" | "who"> {
  switch (entry.kind) {
    case "grant":
      return describeGrant(entry);
    case "zero_out":
      return {
        kind: "expiry",
        action: EXPIRY_ACTION[entry.zeroedOutReason ?? ""] ?? "removed",
        subject: null,
        who: grantSource(entry),
      };
    default: {
      const user = entry.user;
      const userWho: CreditLogWho | null =
        user === undefined || user === null || user.name === ""
          ? null
          : { kind: "user", name: user.name };
      const feature = entry.feature?.name ?? null;
      if (entry.usageReason === "manual_adjustment") {
        return {
          kind: entry.amount > 0 ? "reversal" : "draw",
          action: "usageAdjustment",
          subject: null,
          who: userWho ?? { kind: "manual" },
        };
      }
      return entry.amount > 0
        ? { kind: "reversal", action: "refund", subject: feature, who: userWho }
        : { kind: "draw", action: "usage", subject: feature, who: userWho };
    }
  }
}

function describeGrant(
  entry: CreditLedgerEntry,
): Pick<CreditLogRow, "kind" | "action" | "subject" | "who"> {
  const bundle = entry.bundle?.name ?? null;
  const who = grantSource(entry);
  switch (entry.grantReason) {
    case "billing_credit_auto_topup":
      return { kind: "topup", action: "autoTopup", subject: bundle, who };
    case "purchased":
      return { kind: "topup", action: "purchase", subject: bundle, who };
    case "free":
      return { kind: "grant", action: "freeGrant", subject: null, who };
    case "adjustment":
      return { kind: "grant", action: "adjustmentGrant", subject: null, who };
    case "rollover":
      return { kind: "grant", action: "rollover", subject: null, who };
    default:
      return { kind: "grant", action: "planGrant", subject: null, who };
  }
}

const EXPIRY_ACTION: Record<string, CreditLogAction> = {
  expired: "expired",
  license_retired: "licenseRetired",
  manual: "removed",
  plan_change: "planChange",
  plan_period_reset: "reset",
};

/** Where a grant's credits came from, which an expiry of it inherits. */
function grantSource(entry: CreditLedgerEntry): CreditLogWho {
  switch (entry.grantReason) {
    case "billing_credit_auto_topup":
      return { kind: "autoTopup" };
    case "purchased":
      return { kind: "purchase" };
    case "free":
    case "adjustment":
      return { kind: "manual" };
    default:
      return { kind: "plan" };
  }
}

function relativeDay(at: Date, now: Date): "today" | "yesterday" | null {
  const startOf = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(at)) / 86_400_000);
  return days === 0 ? "today" : days === 1 ? "yesterday" : null;
}
