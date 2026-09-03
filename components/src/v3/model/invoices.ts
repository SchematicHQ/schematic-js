import type { InvoicePage, InvoiceStatus } from "@schematichq/schematic-react";

import { formatCurrency, formatDate } from "./format";

/**
 * `deriveInvoiceList`: invoice history rows, each carrying the raw value and
 * the formatted text. (The next bill is `deriveUpcomingInvoice`, in
 * ./upcoming.)
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
  /** The due date, or the created date when the invoice has no due date. */
  date: Date;
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
      const date = invoice.dueDate ?? invoice.createdAt;
      const currency = invoice.currency.toUpperCase();
      // Generated wire models leave absent optionals undefined; the rows
      // normalize to null so consumers keep one absent-value convention.
      return {
        id: invoice.id,
        date,
        dateText: format?.date?.(date, locale) ?? formatDate(date, locale),
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
    hasMore: page.hasMore,
  };
}
