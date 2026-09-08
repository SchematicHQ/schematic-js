import type { InvoicePage, InvoiceStatus } from "@schematichq/schematic-react";

import { formatCurrency, formatDate, usableDate } from "./format";

/**
 * The element renders this as an href, so a `javascript:` value would run on
 * the host's page. The API drops those on the way out as well, but a page
 * can come from a prefetch or a fixture the host built itself, so the guard
 * has to hold here on its own.
 */
function linkableURL(url: string | null | undefined): string | null {
  if (url === undefined || url === null || url === "") {
    return null;
  }
  try {
    const { protocol } = new URL(url);
    return protocol === "http:" || protocol === "https:" ? url : null;
  } catch {
    // Not a URL at all — a relative path, or something that never was one.
    return null;
  }
}

/**
 * The raw fields are here so a host rendering its own markup never has to
 * abandon the derivation to format differently; the `Text` fields are what
 * the element renders.
 */
export interface InvoiceRow {
  id: string;
  /** Never an Invalid Date: formatting one throws, and hosts render these. */
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
  /** In total, where `rows.length` is only what has been loaded. */
  count: number;
  hasMore: boolean;
}

/** An amount arrives *signed* here, unlike the default text. */
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
      // A malformed date decodes to an Invalid Date, which `??` would keep
      // — so both go through the guard and `date` is a date or nothing.
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
        // Absolute: the element wraps a credit note in parentheses rather
        // than printing a minus, and `isCredit` tells it which.
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
