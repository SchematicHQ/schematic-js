import type {
  CreditBalanceEntry,
  CreditGrant,
} from "@schematichq/schematic-react";

import { featureName, formatDate, formatNumber, usableDate } from "./format";

/**
 * `deriveCreditUsage`: the company's credit balances as the cards show them,
 * with numbers, names and dates formatted here. The wording is the
 * element's, keyed by `kind`.
 */

/** Why credits were granted, as the ledger words it. */
export type CreditGrantKind = "plan" | "bundle" | "autoTopup" | "promotional";

export interface CreditLedgerRow {
  id: string;
  kind: CreditGrantKind;
  /** Credits granted. */
  amount: string;
  /** The credit's name for `amount`; a bundle is named in the singular. */
  item: string;
  /** "Sep 1, 2026". */
  createdAt: string;
  /** When the grant refreshes, or when it runs out; `null` for neither. */
  date: { kind: "resets" | "expires"; text: string } | null;
  source: CreditGrant;
}

export interface CreditCompositionLine {
  /** Credits per period in all. */
  total: string;
  creditName: string;
  /** A period key: "day", "week", "month" or "year". */
  period: string;
  /** "12 Seats × 10". */
  perLicense: { quantity: string; licenseName: string; perUnit: string };
  /** The flat company grant on top; `null` when there is none. */
  companyGrant: string | null;
  /** "1st", "22nd": the day of the month the next bill is due. */
  renewsOn: string | null;
}

export interface CreditUsageRow {
  creditId: string;
  name: string;
  description: string | null;
  /** A schematic-icons glyph name; `null` when the credit has none. */
  icon: string | null;
  /** What is left, to ten fraction digits, and the credit's name for it. */
  remaining: { amount: string; units: string };
  purchasable: boolean;
  /** Newest first. Empty for a plan credit the company holds none of. */
  ledger: CreditLedgerRow[];
  composition: CreditCompositionLine | null;
  /** The credit's names, for a host labelling amounts itself. */
  unit: { name: string; singularName?: string; pluralName?: string };
  source: CreditBalanceEntry;
}

export interface DeriveCreditUsageOptions {
  locale: string;
  /** Credit ids to show, in this order; every credit when absent. */
  visibleCredits?: string[];
}

export function deriveCreditUsage(
  balances: CreditBalanceEntry[],
  options: DeriveCreditUsageOptions,
): CreditUsageRow[] {
  const ordered =
    options.visibleCredits === undefined
      ? balances
      : options.visibleCredits.flatMap((id) => {
          const balance = balances.find((b) => b.creditId === id);
          return balance === undefined ? [] : [balance];
        });
  return ordered.map((balance) => creditUsageRow(balance, options.locale));
}

function creditUsageRow(
  balance: CreditBalanceEntry,
  locale: string,
): CreditUsageRow {
  const unit = {
    name: balance.creditName,
    singularName: balance.creditSingularName ?? undefined,
    pluralName: balance.creditPluralName ?? undefined,
  };
  const composition = balance.composition;
  return {
    creditId: balance.creditId,
    name: balance.creditName,
    description:
      balance.creditDescription === "" ? null : balance.creditDescription,
    icon:
      balance.creditIcon === undefined ||
      balance.creditIcon === null ||
      balance.creditIcon === ""
        ? null
        : balance.creditIcon,
    remaining: {
      // Balances burn at rates with up to ten decimal places, so a small
      // remainder must not round to nothing.
      amount: formatNumber(balance.remaining, locale, {
        maximumFractionDigits: 10,
      }),
      units: featureName(unit, balance.remaining, locale),
    },
    purchasable: balance.purchasable,
    ledger: balance.grants.map((grant) => ledgerRow(grant, unit, locale)),
    composition:
      composition === undefined || composition === null
        ? null
        : {
            total: formatNumber(composition.total, locale),
            creditName: featureName(unit, composition.total, locale),
            period: composition.period,
            perLicense: {
              quantity: formatNumber(composition.licenseQuantity, locale),
              licenseName: featureName(
                {
                  name: composition.licenseName,
                  singularName: composition.licenseSingularName,
                  pluralName: composition.licensePluralName,
                },
                composition.licenseQuantity,
                locale,
              ),
              perUnit: formatNumber(composition.perLicenseAmount, locale),
            },
            companyGrant:
              composition.fixedQuantity > 0
                ? formatNumber(composition.fixedQuantity, locale)
                : null,
            renewsOn: renewsOn(composition.renewsAt, locale),
          },
    unit,
    source: balance,
  };
}

function ledgerRow(
  grant: CreditGrant,
  unit: CreditUsageRow["unit"],
  locale: string,
): CreditLedgerRow {
  const kind: CreditGrantKind =
    grant.grantReason === "plan"
      ? "plan"
      : grant.grantReason === "purchased"
        ? "bundle"
        : grant.grantReason === "billing_credit_auto_topup"
          ? "autoTopup"
          : "promotional";
  const short = (date: Date) => formatDate(date, locale, { month: "short" });
  const resetsAt = usableDate(grant.resetsAt);
  const expiresAt = usableDate(grant.expiresAt);
  return {
    id: grant.id,
    kind,
    amount: formatNumber(grant.quantity, locale),
    item: featureName(unit, kind === "bundle" ? 1 : grant.quantity, locale),
    createdAt: short(grant.createdAt),
    date:
      resetsAt !== undefined
        ? { kind: "resets", text: short(resetsAt) }
        : expiresAt !== undefined
          ? { kind: "expires", text: short(expiresAt) }
          : null,
    source: grant,
  };
}

/**
 * The day of the month the next bill is due, as an ordinal in the viewer's
 * time zone. English takes its suffixes; other languages get the number,
 * since their ordinals are words a template cannot bolt on.
 */
function renewsOn(
  date: Date | null | undefined,
  locale: string,
): string | null {
  const due = usableDate(date);
  if (due === undefined) {
    return null;
  }
  const day = due.getDate();
  if (!isEnglish(locale)) {
    return formatNumber(day, locale);
  }
  const suffix: Record<Intl.LDMLPluralRule, string> = {
    few: "rd",
    many: "th",
    one: "st",
    other: "th",
    two: "nd",
    zero: "th",
  };
  return `${day}${suffix[new Intl.PluralRules("en", { type: "ordinal" }).select(day)]}`;
}

function isEnglish(locale: string): boolean {
  try {
    return new Intl.Locale(locale).language === "en";
  } catch {
    return false;
  }
}
