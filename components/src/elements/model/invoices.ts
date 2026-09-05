import type { InvoicePage, InvoiceStatus } from "@schematichq/schematic-react";

import { formatCurrency, formatDate, usableDate } from "./format";

/**
 * `deriveInvoiceList`: invoice history rows, each carrying the raw value and
 * the formatted text. (`deriveUpcomingInvoice` ships with UpcomingBill.)
 */

/**
 * One row, carrying both the value and the text.
 *
 * The raw fields are there so a host rendering its own markup never has to
 * abandon the derivation to format differently — accounting parentheses, a
 * compact date, a currency shown as a code. The `Text` fields are what the
 * element renders.
 */
export interface InvoiceRow {
  id: string;
  /**
   * The due date, or the created date when the invoice has no due date, or
   * `null` when neither is a date `Intl` can format. Never an Invalid Date:
   * formatting one throws, and these rows are handed to hosts rendering
   * their own markup.
   */
  date: Date | null;
  dateText: string;
  /** Signed, in the currency's minor units: negative is a credit note. */
  amountMinor: number;
  /** ISO 4217 code, upper-cased. */
  currency: string;
  /** The amount as text — absolute by default, with `isCredit` for the sign. */
  amountText: string;
  /** Negative invoices are credit notes; render `amountText` in parentheses. */
  isCredit: boolean;
  status: InvoiceStatus | null;
  url: string | null;
}

export interface InvoiceList {
  rows: InvoiceRow[];
  /**
   * Invoices the company has in total, which is what a header counts —
   * `rows.length` is only what has been loaded.
   */
  count: number;
  hasMore: boolean;
}

/**
 * Per-field formatting, for a host that wants the derivation's rows but not
 * its wording. Each receives the raw value and the resolved locale; an
 * amount arrives *signed*, unlike the default text.
 */
export interface InvoiceFormatters {
  date?: (date: Date, locale: string) => string;
  amount?: (amountMinor: number, currency: string, locale: string) => string;
}

export interface DeriveInvoiceListOptions {
  locale: string;
  format?: InvoiceFormatters;
}

export function deriveInvoiceList(
  page: InvoicePage,
  options: DeriveInvoiceListOptions,
): InvoiceList {
  const { format, locale } = options;
  return {
    rows: page.invoices.map((invoice) => {
      // A date the API sent malformed decodes to an Invalid Date, which
      // `??` would keep — leaving the row with no date to show and no link
      // to hang it on, while the created date it should fall back to sits
      // right there. Both go through the guard, so `date` is a date or
      // nothing.
      const date =
        usableDate(invoice.dueDate) ?? usableDate(invoice.createdAt) ?? null;
      const currency = invoice.currency.toUpperCase();
      // Generated wire models leave absent optionals undefined; the rows
      // normalize to null so consumers keep one absent-value convention.
      return {
        id: invoice.id,
        date,
        dateText:
          date === null
            ? ""
            : (format?.date?.(date, locale) ?? formatDate(date, locale)),
        amountMinor: invoice.amountDue,
        currency,
        // The default text is the absolute amount: the element wraps a
        // credit note in parentheses rather than printing a minus sign, and
        // `isCredit` is what tells it which. An override gets the sign and
        // decides for itself.
        amountText:
          format?.amount?.(invoice.amountDue, currency, locale) ??
          formatCurrency(Math.abs(invoice.amountDue), currency, locale, {
            preserveSubUnitPrecision: false,
          }),
        isCredit: invoice.amountDue < 0,
        status: invoice.status ?? null,
        url: invoice.url ?? null,
      };
    }),
    count: page.count,
    hasMore: page.hasMore,
  };
}
