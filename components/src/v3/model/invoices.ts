import type {
  Discount,
  InvoicePage,
  InvoiceStatus,
  Subscription,
  UpcomingInvoice,
} from "@schematichq/schematic-react";

import { formatCurrency, formatDate } from "./format";
import { PERIOD_WORD, derivePeriod, type PricePeriod } from "./period";

/**
 * `deriveInvoiceList` and `deriveUpcomingInvoice`: invoice history rows
 * and the next bill, with balances and discounts as formatted parts.
 */

export interface InvoiceRow {
  id: string;
  date: Date;
  dateText: string;
  /** Absolute amount, formatted. */
  amountText: string;
  /** Negative invoices are credit notes; render `amountText` in parentheses. */
  isCredit: boolean;
  status: InvoiceStatus | null;
  url: string | null;
}

export interface InvoiceList {
  rows: InvoiceRow[];
  hasMore: boolean;
}

export function deriveInvoiceList(
  page: InvoicePage,
  options: { locale: string },
): InvoiceList {
  const { locale } = options;
  return {
    rows: page.invoices.map((invoice) => {
      const date = invoice.dueDate ?? invoice.createdAt;
      return {
        id: invoice.id,
        date,
        dateText: formatDate(date, locale),
        amountText: formatCurrency(
          Math.abs(invoice.amountDue),
          invoice.currency,
          locale,
          {
            preserveSubUnitPrecision: false,
          },
        ),
        isCredit: invoice.amountDue < 0,
        status: invoice.status,
        url: invoice.url,
      };
    }),
    hasMore: page.hasMore,
  };
}

export interface DiscountLine {
  couponName: string;
  code: string | null;
  /** "20%" or "$5.00". */
  valueText: string;
  /** Months the discount repeats for, when it does. */
  months: number | null;
  duration: Discount["duration"];
}

export interface UpcomingInvoiceSummary {
  amountDue: number;
  amountDueText: string;
  subtotalText: string;
  currency: string;
  dueAt: { date: Date; text: string } | null;
  discounts: DiscountLine[];
  /** Customer balance applied to this invoice, when any. */
  balanceApplied: { amount: number; text: string } | null;
  /** Customer balance left after this invoice, when any balance exists. */
  balanceRemaining: { amount: number; text: string } | null;
  /** The subscription's period word, for "per month". */
  periodWord: string | null;
  period: PricePeriod | null;
  /** When the subscription ends, if it is scheduled to. */
  contractEndsAt: { date: Date; text: string } | null;
}

/**
 * When the subscription is scheduled to end (`cancelAt`), the end date as
 * a formatted part; `null` otherwise. Shared by the upcoming-invoice summary
 * and the empty state, which still shows the contract end when there is
 * nothing left to invoice.
 */
export function deriveContractEnd(
  subscription: Subscription | null | undefined,
  options: { locale: string },
): { date: Date; text: string } | null {
  if (
    subscription === undefined ||
    subscription === null ||
    subscription.cancelAt === null
  ) {
    return null;
  }
  return {
    date: subscription.cancelAt,
    text: formatDate(subscription.cancelAt, options.locale),
  };
}

export function deriveUpcomingInvoice(
  invoice: UpcomingInvoice,
  subscription: Subscription | null,
  options: { locale: string },
): UpcomingInvoiceSummary {
  const { locale } = options;
  const period =
    subscription === null
      ? null
      : derivePeriod(subscription.interval, subscription.intervalCount);
  const applied = invoice.customerBalanceApplied;
  const remaining = invoice.customerBalanceRemaining;
  const money = (amount: number) =>
    formatCurrency(amount, invoice.currency, locale, {
      preserveSubUnitPrecision: false,
    });
  return {
    amountDue: invoice.amountDue,
    amountDueText: money(invoice.amountDue),
    subtotalText: money(invoice.subtotal),
    currency: invoice.currency,
    dueAt:
      invoice.dueDate === null
        ? null
        : { date: invoice.dueDate, text: formatDate(invoice.dueDate, locale) },
    discounts: invoice.discounts.flatMap((discount) => {
      const percent = discount.percentOff !== null && discount.percentOff > 0;
      const amount = discount.amountOff !== null && discount.amountOff > 0;
      if (!percent && !amount) {
        return [];
      }
      return [
        {
          couponName: discount.couponName,
          code: discount.customerFacingCode,
          valueText: percent
            ? `${discount.percentOff}%`
            : formatCurrency(
                discount.amountOff ?? 0,
                discount.currency ?? invoice.currency,
                locale,
                { preserveSubUnitPrecision: false },
              ),
          months:
            discount.duration === "repeating"
              ? discount.durationInMonths
              : null,
          duration: discount.duration,
        },
      ];
    }),
    balanceApplied:
      applied > 0 ? { amount: applied, text: money(applied) } : null,
    balanceRemaining:
      applied > 0 || remaining > 0
        ? { amount: remaining, text: money(remaining) }
        : null,
    periodWord: period === null ? null : PERIOD_WORD[period],
    period,
    contractEndsAt: deriveContractEnd(subscription, { locale }),
  };
}
