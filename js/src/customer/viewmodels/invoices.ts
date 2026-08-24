import {
  type CompanyInvoiceResponseData,
  type CompanyUpcomingInvoiceResponseData,
} from "../api/customer";

import { formatCurrency, formatDate, type FormatOptions } from "./format";

export interface InvoiceRow {
  amountDue: number;
  currency: string;
  /** Invoice date: due date, falling back to creation date. */
  date: Date;
  formattedAmount: string;
  formattedDate: string;
  id: string;
  status?: string;
  /** Hosted invoice URL, when the provider exposes one. */
  url?: string;
}

/**
 * Builds display rows for the invoice history. Filtering and ordering are
 * server-side; this formats amounts (accounting-style negatives for credit
 * notes) and dates.
 */
export const deriveInvoiceList = (
  invoices: CompanyInvoiceResponseData[],
  options: FormatOptions = {},
): InvoiceRow[] => {
  return invoices.map((invoice) => {
    const date = invoice.dueDate ?? invoice.createdAt;
    return {
      amountDue: invoice.amountDue,
      currency: invoice.currency,
      date,
      formattedAmount: formatCurrency(invoice.amountDue, invoice.currency, {
        ...options,
        accountingSign: true,
      }),
      formattedDate: formatDate(date, options),
      id: invoice.id,
      ...(invoice.status != null ? { status: invoice.status } : {}),
      ...(invoice.url != null ? { url: invoice.url } : {}),
    };
  });
};

export interface UpcomingInvoiceDiscount {
  amountOff?: number;
  couponName: string;
  customerFacingCode?: string;
  /** once | repeating | forever, as reported by the provider. */
  duration: string;
  durationInMonths?: number;
  formattedAmountOff?: string;
  percentOff?: number;
}

export interface UpcomingInvoiceSummary {
  amountDue: number;
  /** Existing credit balance this invoice consumes. */
  balanceApplied: number;
  /** Credit balance left over after this invoice. */
  balanceRemaining: number;
  currency: string;
  discounts: UpcomingInvoiceDiscount[];
  dueDate?: Date;
  formattedAmountDue: string;
  formattedBalanceApplied?: string;
  formattedBalanceRemaining?: string;
  formattedDueDate?: string;
  formattedSubtotal: string;
  subtotal: number;
}

/**
 * Builds the upcoming-bill view. The customer-balance math (provider sign
 * conventions included) is computed server-side; this only formats.
 */
export const deriveUpcomingInvoice = (
  upcoming: CompanyUpcomingInvoiceResponseData,
  options: FormatOptions = {},
): UpcomingInvoiceSummary => {
  const vm: UpcomingInvoiceSummary = {
    amountDue: upcoming.amountDue,
    balanceApplied: upcoming.customerBalanceApplied,
    balanceRemaining: upcoming.customerBalanceRemaining,
    currency: upcoming.currency,
    discounts: upcoming.discounts.map((discount) => ({
      couponName: discount.couponName,
      duration: discount.duration,
      ...(discount.amountOff != null
        ? {
            amountOff: discount.amountOff,
            formattedAmountOff: formatCurrency(
              discount.amountOff,
              discount.currency ?? upcoming.currency,
              options,
            ),
          }
        : {}),
      ...(discount.customerFacingCode != null
        ? { customerFacingCode: discount.customerFacingCode }
        : {}),
      ...(discount.durationInMonths != null
        ? { durationInMonths: discount.durationInMonths }
        : {}),
      ...(discount.percentOff != null
        ? { percentOff: discount.percentOff }
        : {}),
    })),
    formattedAmountDue: formatCurrency(
      upcoming.amountDue,
      upcoming.currency,
      options,
    ),
    formattedSubtotal: formatCurrency(
      upcoming.subtotal,
      upcoming.currency,
      options,
    ),
    subtotal: upcoming.subtotal,
  };
  if (upcoming.customerBalanceApplied > 0) {
    vm.formattedBalanceApplied = formatCurrency(
      upcoming.customerBalanceApplied,
      upcoming.currency,
      options,
    );
  }
  if (upcoming.customerBalanceRemaining > 0) {
    vm.formattedBalanceRemaining = formatCurrency(
      upcoming.customerBalanceRemaining,
      upcoming.currency,
      options,
    );
  }
  if (upcoming.dueDate != null) {
    vm.dueDate = upcoming.dueDate;
    vm.formattedDueDate = formatDate(upcoming.dueDate, options);
  }
  return vm;
};
