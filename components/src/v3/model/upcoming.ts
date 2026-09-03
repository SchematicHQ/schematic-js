import type { Discount, UpcomingInvoice } from "@schematichq/schematic-react";

import { formatCurrency, formatDate, formatPercent } from "./format";

/**
 * `deriveUpcomingInvoice`: the company's next bill as display parts — the
 * estimated amount, the balance it consumes, and the discounts shaping it.
 *
 * The arithmetic is not here. The server sends what the balance applies and
 * what survives, because those depend on provider conventions (a negative
 * balance is held credit; a previewed invoice reports no ending balance)
 * that no consumer should have to know.
 */

/** One discount on the subscription, as the bill shows it. */
export interface DiscountLine {
  /** The coupon's name, for a discount with no promo code to show. */
  couponName: string;
  /** The promo code, for the chip beside the amount; `null` when none. */
  code: string | null;
  /** Whether the discount takes a percentage off or a fixed amount. */
  kind: "percent" | "amount";
  /** "20%" or "$5.00" — what comes off. */
  valueText: string;
  /** The percentage as written (20 for 20% off); `null` for an amount. */
  percentOff: number | null;
  /** Minor units off; `null` for a percentage. */
  amountOffMinor: number | null;
  /** Months the discount repeats for; `null` when it does not repeat. */
  months: number | null;
  /** Provider vocabulary: `once`, `repeating`, or `forever`. */
  duration: string;
}

/** An amount on the bill, with the text for it. */
export interface BillLine {
  /** Minor units, signed as it affects the bill. */
  amountMinor: number;
  amountText: string;
}

export interface UpcomingBillSummary {
  /** What the company will be charged, after discounts and balance. */
  amountDueMinor: number;
  amountDueText: string;
  /** Before discounts and tax. */
  subtotalMinor: number;
  subtotalText: string;
  /** ISO 4217 code, upper-cased. */
  currency: string;
  /** When it will be charged; `null` when the provider names no date. */
  dueAt: { date: Date; text: string } | null;
  /**
   * The stored balance this invoice consumes, as a deduction — the amount is
   * negative and its text carries the locale's sign. `null` when the company
   * holds no balance.
   */
  balanceApplied: BillLine | null;
  /**
   * What is left of the balance afterwards, as a positive amount. `null`
   * when there was no balance to begin with — a company that has one, and
   * spends all of it, still gets a zero here to say so.
   */
  balanceRemaining: BillLine | null;
  /** Active discounts, already filtered server-side to the ones that bite. */
  discounts: DiscountLine[];
}

/**
 * Per-field formatting, for a host that wants the derivation's parts but not
 * its wording. Each receives the raw value and the resolved locale; amounts
 * arrive signed.
 */
export interface UpcomingInvoiceFormatters {
  date?: (date: Date, locale: string) => string;
  amount?: (amountMinor: number, currency: string, locale: string) => string;
}

export interface DeriveUpcomingInvoiceOptions {
  locale: string;
  format?: UpcomingInvoiceFormatters;
}

export function deriveUpcomingInvoice(
  invoice: UpcomingInvoice,
  options: DeriveUpcomingInvoiceOptions,
): UpcomingBillSummary {
  const { format, locale } = options;
  const currency = invoice.currency.toUpperCase();
  const money = (amountMinor: number): string =>
    format?.amount?.(amountMinor, currency, locale) ??
    formatCurrency(amountMinor, currency, locale, {
      preserveSubUnitPrecision: false,
    });
  const line = (amountMinor: number): BillLine => ({
    amountMinor,
    amountText: money(amountMinor),
  });

  const applied = invoice.customerBalanceApplied;
  const remaining = invoice.customerBalanceRemaining;
  const dueDate = invoice.dueDate ?? null;

  return {
    amountDueMinor: invoice.amountDue,
    amountDueText: money(invoice.amountDue),
    subtotalMinor: invoice.subtotal,
    subtotalText: money(invoice.subtotal),
    currency,
    dueAt:
      dueDate === null
        ? null
        : {
            date: dueDate,
            text:
              format?.date?.(dueDate, locale) ?? formatDate(dueDate, locale),
          },
    // A deduction: the sign is the locale's, so a host never assembles one.
    balanceApplied: applied > 0 ? line(-applied) : null,
    // Zero remaining is worth saying when a balance was spent; no balance at
    // all is not.
    balanceRemaining: applied > 0 || remaining > 0 ? line(remaining) : null,
    discounts: invoice.discounts.flatMap((discount) =>
      discountLine(discount, currency, locale, money),
    ),
  };
}

/**
 * One discount, or nothing.
 *
 * The server only sends discounts that reduce the bill, so the guard here is
 * about the wire types rather than the data: both amounts are optional, and
 * a discount with neither is not something to render an empty "off" for.
 */
function discountLine(
  discount: Discount,
  invoiceCurrency: string,
  locale: string,
  money: (amountMinor: number) => string,
): DiscountLine[] {
  const percentOff = discount.percentOff ?? null;
  const amountOff = discount.amountOff ?? null;
  const isPercent = percentOff !== null && percentOff > 0;
  if (!isPercent && (amountOff === null || amountOff <= 0)) {
    return [];
  }

  // A fixed-amount coupon carries its own currency; a percentage takes the
  // invoice's, and never formats an amount at all.
  const currency = discount.currency?.toUpperCase() ?? invoiceCurrency;
  return [
    {
      couponName: discount.couponName,
      code: discount.customerFacingCode ?? null,
      kind: isPercent ? "percent" : "amount",
      valueText: isPercent
        ? formatPercent(percentOff / 100, locale)
        : currency === invoiceCurrency
          ? money(amountOff ?? 0)
          : formatCurrency(amountOff ?? 0, currency, locale, {
              preserveSubUnitPrecision: false,
            }),
      percentOff: isPercent ? percentOff : null,
      amountOffMinor: isPercent ? null : amountOff,
      months:
        discount.duration === "repeating"
          ? (discount.durationInMonths ?? null)
          : null,
      duration: discount.duration,
    },
  ];
}
