import type { InvoicePage, InvoiceStatus } from "@schematichq/schematic-react";

import { formatCurrency, formatDate, usableDate } from "./format";

/**
 * Rendered as an href, so a `javascript:` value would run on the host's
 * page. The API filters these too, but a page can come from a host-built
 * fixture or prefetch, so the guard holds here as well.
 */
function linkableURL(url: string | null | undefined): string | null {
  if (url === undefined || url === null || url === "") {
    return null;
  }
  try {
    const { protocol } = new URL(url);
    return protocol === "http:" || protocol === "https:" ? url : null;
  } catch {
    // Relative paths and non-URLs.
    return null;
  }
}

/**
 * The `Text` fields are what the element renders. The raw fields beside them
 * let a host format differently without re-deriving.
 */
export interface InvoiceRow {
  id: string;
  /** Never an Invalid Date, which throws when formatted. */
  date: Date | null;
  dateText: string;
  /** Signed, in the currency's minor units: negative is a credit note. */
  amountMinor: number;
  /** ISO 4217 code, upper-cased. */
  currency: string;
  /** Absolute by default; `isCredit` carries the sign. */
  amountText: string;
  /** Negative invoices are credit notes; render `amountText` in parentheses. */
  isCredit: boolean;
  status: InvoiceStatus | null;
  url: string | null;
}

export interface InvoiceList {
  rows: InvoiceRow[];
  /** Total on the server; `rows.length` is only what has been loaded. */
  count: number;
  hasMore: boolean;
}

/** `amount` receives the signed value, unlike the default text. */
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
      // An Invalid Date is not nullish, so `??` alone would keep it.
      const date =
        usableDate(invoice.dueDate) ?? usableDate(invoice.createdAt) ?? null;
      const currency = invoice.currency.toUpperCase();
      return {
        id: invoice.id,
        date,
        dateText:
          date === null
            ? ""
            : (format?.date?.(date, locale) ?? formatDate(date, locale)),
        amountMinor: invoice.amountDue,
        currency,
        // Absolute: credit notes render in parentheses, not with a minus sign.
        amountText:
          format?.amount?.(invoice.amountDue, currency, locale) ??
          formatCurrency(Math.abs(invoice.amountDue), currency, locale, {
            preserveSubUnitPrecision: false,
          }),
        isCredit: invoice.amountDue < 0,
        status: invoice.status ?? null,
        url: linkableURL(invoice.url),
      };
    }),
    count: page.count,
    hasMore: page.hasMore,
  };
}
