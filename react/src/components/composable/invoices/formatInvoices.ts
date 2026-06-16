// Pure invoice formatting/filtering. Lives in the headless layer so both the
// `Invoices` primitive controller and the styled wrapper share it (and the
// styled `Invoices.tsx` re-exports it for backward compatibility).

import {
  InvoiceStatus,
  type InvoiceResponseData,
} from "../../api/checkoutexternal";
import { formatCurrency, toPrettyDate } from "../../utils";

export interface FormattedInvoice {
  amount: string;
  amountDue: number;
  date: string;
  url?: string;
}

interface FormatInvoiceOptions {
  hideUpcoming?: boolean;
}

export function formatInvoices(
  invoices?: InvoiceResponseData[],
  options?: FormatInvoiceOptions,
): FormattedInvoice[] {
  const { hideUpcoming = true } = options || {};
  const now = new Date();

  const excludedStatuses: InvoiceStatus[] = [
    InvoiceStatus.Void,
    InvoiceStatus.Draft,
    InvoiceStatus.Uncollectible,
  ];

  return (invoices || [])
    .filter(({ amountDue, dueDate, externalId, status }) => {
      if (amountDue === 0) return false;
      if (externalId?.startsWith("upcoming_")) return false;
      if (status && excludedStatuses.includes(status as InvoiceStatus))
        return false;
      if (
        hideUpcoming &&
        status !== InvoiceStatus.Paid &&
        !(dueDate && +dueDate <= +now)
      )
        return false;
      return true;
    })
    .sort((a, b) => {
      const dateA = a.dueDate ?? a.createdAt;
      const dateB = b.dueDate ?? b.createdAt;
      return +dateB - +dateA;
    })
    .map(({ amountDue, dueDate, createdAt, url, currency }) => {
      const formatted = formatCurrency(Math.abs(amountDue), currency);
      return {
        amount: amountDue < 0 ? `(${formatted})` : formatted,
        amountDue,
        date: toPrettyDate(dueDate ?? createdAt),
        url: url || undefined,
      };
    });
}
