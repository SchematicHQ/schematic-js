import type {
  AnyCatalog,
  CreditBalance,
  CreditBundle,
  CreditGrantRow,
  CreditRef,
} from "../contract";

import { DEFAULT_WARNING_PERCENT, type UsageState } from "./entitlement";
import {
  featureName,
  formatCurrency,
  formatDate,
  formatNumber,
} from "./format";
import { priceAmount } from "./prices";

/**
 * `deriveCreditBalances`: per-credit burndown with its ledger, plus the
 * bundles on offer for topping up.
 */

export interface CreditOptions {
  locale: string;
  /** The catalog, for bundles on offer. */
  catalog?: AnyCatalog;
  /** The company's current plan, for bundle compatibility. */
  currentPlanId?: string | null;
  /** Currency to price bundles in; default the catalog's. */
  currency?: string;
  /** Percent used at which the meter warns. Default 90. */
  warningPercent?: number;
}

export type LedgerKind =
  "auto_topup" | "other" | "plan" | "promotional" | "purchased";

export interface LedgerRow {
  id: string;
  kind: LedgerKind;
  quantity: number;
  quantityText: string;
  unit: string;
  /** Plan or bundle name the grant came from. */
  sourceName: string | null;
  createdAt: Date;
  createdAtText: string;
  /** Plan grants reset; others expire. */
  resetsAt: { date: Date; text: string } | null;
  expiresAt: { date: Date; text: string } | null;
}

export interface BundleOffer {
  id: string;
  name: string;
  quantity: number | null;
  quantityText: string | null;
  /** "$25.00" for a fixed bundle, or the per-credit price for custom quantities. */
  priceText: string | null;
  isPerCredit: boolean;
  /** Singular credit name, for "per AI credit" on custom-quantity bundles. */
  unit: string;
}

export interface CreditBalanceSummary {
  credit: CreditRef & { description: string };
  icon: string | null;
  total: number;
  used: number;
  remaining: number;
  totalText: string;
  usedText: string;
  remainingText: string;
  /** Unit for `remaining`. */
  unit: string;
  /** 0–100 of the total used; null when nothing was granted. */
  percentUsed: number | null;
  state: UsageState;
  expiresAt: { date: Date; text: string } | null;
  ledger: LedgerRow[];
  /** Bundles purchasable on the current plan for this credit. */
  bundles: BundleOffer[];
  canBuyMore: boolean;
}

function ledgerKind(row: CreditGrantRow): LedgerKind {
  switch (row.reason) {
    case "plan":
      return "plan";
    case "purchased":
      return "purchased";
    case "billing_credit_auto_topup":
      return "auto_topup";
    case "free":
      return "promotional";
    default:
      return "other";
  }
}

function bundleOffer(
  bundle: CreditBundle,
  currency: string,
  locale: string,
): BundleOffer {
  const price =
    bundle.prices.find((p) => p.currency.toLowerCase() === currency) ?? null;
  const unitPrice =
    bundle.unitPrices.find((p) => p.currency.toLowerCase() === currency) ??
    null;
  const shown = bundle.quantity === null ? unitPrice : price;
  return {
    id: bundle.id,
    name: bundle.name,
    quantity: bundle.quantity,
    quantityText:
      bundle.quantity === null ? null : formatNumber(bundle.quantity, locale),
    priceText:
      shown === null
        ? null
        : formatCurrency(priceAmount(shown), shown.currency, locale),
    isPerCredit: bundle.quantity === null,
    unit: featureName(bundle.credit, 1),
  };
}

export function bundleCompatible(
  bundle: Pick<CreditBundle, "compatiblePlanIds">,
  planId: string | null | undefined,
): boolean {
  if (bundle.compatiblePlanIds === null) {
    return true;
  }
  return (
    planId !== null &&
    planId !== undefined &&
    bundle.compatiblePlanIds.includes(planId)
  );
}

export function deriveCreditBalances(
  balances: CreditBalance[],
  options: CreditOptions,
): CreditBalanceSummary[] {
  const { catalog, currentPlanId, locale } = options;
  const warningPercent = options.warningPercent ?? DEFAULT_WARNING_PERCENT;
  const currency = (
    options.currency ??
    catalog?.defaultCurrency ??
    "usd"
  ).toLowerCase();
  const canCheckout = catalog?.capabilities.checkout ?? false;

  return balances.map((balance) => {
    const percentUsed =
      balance.total > 0 ? (balance.used / balance.total) * 100 : null;
    const bundles = (catalog?.creditBundles ?? [])
      .filter(
        (bundle) =>
          bundle.credit.id === balance.credit.id &&
          bundleCompatible(bundle, currentPlanId),
      )
      .map((bundle) => bundleOffer(bundle, currency, locale));
    return {
      credit: balance.credit,
      icon: balance.credit.icon,
      total: balance.total,
      used: balance.used,
      remaining: balance.remaining,
      totalText: formatNumber(balance.total, locale),
      usedText: formatNumber(balance.used, locale),
      remainingText: formatNumber(balance.remaining, locale),
      unit: featureName(balance.credit, balance.remaining),
      percentUsed,
      state:
        balance.remaining <= 0 && balance.total > 0
          ? "over"
          : percentUsed !== null && percentUsed >= warningPercent
            ? "warning"
            : "ok",
      expiresAt:
        balance.expiresAt === null
          ? null
          : {
              date: balance.expiresAt,
              text: formatDate(balance.expiresAt, locale),
            },
      ledger: [...balance.grants]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map((row) => {
          const kind = ledgerKind(row);
          const expiry =
            row.expiresAt === null
              ? null
              : {
                  date: row.expiresAt,
                  text: formatDate(row.expiresAt, locale, { month: "short" }),
                };
          return {
            id: row.id,
            kind,
            quantity: row.quantity,
            quantityText: formatNumber(row.quantity, locale),
            unit: featureName(balance.credit, row.quantity),
            sourceName: row.plan?.name ?? row.bundle?.name ?? null,
            createdAt: row.createdAt,
            createdAtText: formatDate(row.createdAt, locale, {
              month: "short",
            }),
            resetsAt:
              kind === "plan" && row.renewalPeriod !== null ? expiry : null,
            expiresAt:
              kind === "plan" && row.renewalPeriod !== null ? null : expiry,
          };
        }),
      bundles,
      canBuyMore: canCheckout && bundles.length > 0,
    };
  });
}
