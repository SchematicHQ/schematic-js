import { useMemo } from "react";

import {
  BillingCollectionMethod,
  type UpcomingInvoiceResponseData,
} from "../api/checkoutexternal";

import { useEmbed } from ".";

/**
 * The date the next invoice is raised, and, for net-terms subscriptions, the
 * later date it must be paid by.
 *
 * `upcomingInvoice.dueDate` is the deadline for *paying* the invoice. On a
 * `send_invoice` subscription that is the bill date plus the net terms, so it
 * falls weeks after the customer is actually billed. The subscription's period
 * end is when the invoice is raised; `dueDate` is only the fallback, for the
 * automatic-collection case where the two coincide.
 *
 * A subscription set to cancel at period end has no next bill, so both dates
 * are `undefined`.
 */
export function useNextBillDate(
  upcomingInvoice?: UpcomingInvoiceResponseData | null,
) {
  const { data } = useEmbed();

  const invoice =
    upcomingInvoice === undefined ? data?.upcomingInvoice : upcomingInvoice;
  const subscription = data?.company?.billingSubscription;
  const cancelAtPeriodEnd = subscription?.cancelAtPeriodEnd;
  const periodEnd = subscription?.periodEnd;
  const collectionMethod = invoice?.collectionMethod;
  const dueDate = invoice?.dueDate ?? undefined;

  return useMemo(() => {
    if (cancelAtPeriodEnd) {
      return { billDate: undefined, paymentDueDate: undefined };
    }

    // `periodEnd` defaults to 0 when unset, which is not a real date.
    const billDate =
      periodEnd && periodEnd > 0 ? new Date(periodEnd * 1000) : dueDate;

    // Compare calendar days so a time-of-day difference is not shown as a
    // separate deadline.
    const hasSeparateDeadline =
      collectionMethod === BillingCollectionMethod.SendInvoice &&
      dueDate &&
      billDate &&
      new Date(dueDate).toDateString() !== new Date(billDate).toDateString();

    return {
      billDate,
      paymentDueDate: hasSeparateDeadline ? dueDate : undefined,
    };
  }, [cancelAtPeriodEnd, periodEnd, collectionMethod, dueDate]);
}
