import {
  InvoiceStatus,
  type CompanySubscriptionResponseData,
  type CreditCompanyGrantView,
  type InvoiceResponseData,
  type ScheduledDowngradeResponseData,
} from "../checkoutexternal";

/** ----- Invoices ----- */

export interface FilterInvoicesOptions {
  /** Drop invoices that are not yet paid and not yet due. Default true. */
  hideUpcoming?: boolean;
}

const HIDDEN_STATUSES = new Set<string>([
  InvoiceStatus.Void,
  InvoiceStatus.Draft,
  InvoiceStatus.Uncollectible,
]);

/**
 * Filters an invoice list down to what's worth showing a customer:
 * no zero-amount invoices, no Stripe "upcoming_" previews, no void/draft/
 * uncollectible, and (by default) nothing that isn't paid or past due.
 * Sorted newest first by dueDate, falling back to createdAt.
 */
export function filterInvoicesForDisplay(
  invoices: InvoiceResponseData[],
  options?: FilterInvoicesOptions,
): InvoiceResponseData[] {
  const hideUpcoming = options?.hideUpcoming ?? true;
  const now = Date.now();

  return invoices
    .filter((invoice) => {
      if (invoice.amountDue === 0) {
        return false;
      }
      if (invoice.externalId?.startsWith("upcoming_") === true) {
        return false;
      }
      if (invoice.status != null && HIDDEN_STATUSES.has(invoice.status)) {
        return false;
      }
      if (hideUpcoming && invoice.status !== InvoiceStatus.Paid) {
        const due = invoice.dueDate?.getTime();
        const isPastDue = due !== undefined && due < now;
        if (!isPastDue) {
          return false;
        }
      }
      return true;
    })
    .sort((a, b) => {
      const aTime = (a.dueDate ?? a.createdAt).getTime();
      const bTime = (b.dueDate ?? b.createdAt).getTime();
      return bTime - aTime;
    });
}

/** ----- Upcoming bill ----- */

export interface AppliedBalance {
  /** Customer credit held before this invoice (positive number of cents). */
  customerCredit: number;
  /** How much of that credit this invoice consumes. */
  applied: number;
  /** Credit left over after this invoice. */
  remaining: number;
}

/**
 * Stripe represents customer credit as a negative balance. On preview/upcoming
 * invoices Stripe often leaves ending_balance at 0, so when it *is* negative we
 * trust it, and otherwise cap the applied credit at the invoice subtotal.
 */
export function deriveAppliedBalance(
  invoice: InvoiceResponseData,
): AppliedBalance | undefined {
  const startingBalance = invoice.startingBalance ?? 0;
  if (startingBalance >= 0) {
    return undefined;
  }
  const customerCredit = -startingBalance;
  const endingBalance = invoice.endingBalance ?? 0;
  const applied =
    endingBalance < 0
      ? customerCredit + endingBalance
      : Math.min(customerCredit, invoice.subtotal ?? 0);
  return {
    customerCredit,
    applied,
    remaining: customerCredit - applied,
  };
}

/** ----- Plan manager notice ----- */

export type PlanManagerNotice =
  | { kind: "trial"; trialEnd: Date; daysLeft: number }
  | { kind: "canceled"; cancelAt: Date }
  | { kind: "downgrade"; toPlanName: string; effectiveAfter: Date };

/**
 * At most one notice is shown, in priority order: trial ending, subscription
 * canceled, scheduled downgrade.
 */
export function getPlanManagerNotice(
  subscription?: CompanySubscriptionResponseData,
  scheduledDowngrade?: ScheduledDowngradeResponseData,
  now: () => number = () => Date.now(),
): PlanManagerNotice | undefined {
  if (
    subscription?.status === "trialing" &&
    subscription.trialEnd != null &&
    subscription.trialEnd.getTime() > now()
  ) {
    const msLeft = subscription.trialEnd.getTime() - now();
    return {
      kind: "trial",
      trialEnd: subscription.trialEnd,
      daysLeft: Math.ceil(msLeft / (24 * 60 * 60 * 1000)),
    };
  }

  if (
    subscription?.cancelAtPeriodEnd === true &&
    subscription.cancelAt != null
  ) {
    return { kind: "canceled", cancelAt: subscription.cancelAt };
  }

  if (scheduledDowngrade !== undefined) {
    return {
      kind: "downgrade",
      toPlanName: scheduledDowngrade.toPlanName,
      effectiveAfter: scheduledDowngrade.effectiveAfter,
    };
  }

  return undefined;
}

/** ----- Credit grants ----- */

export interface CreditGroup {
  creditId: string;
  name: string;
  singularName?: string;
  pluralName?: string;
  description?: string;
  icon?: string;
  total: {
    value: number;
    used: number;
    remaining: number;
  };
  grants: CreditCompanyGrantView[];
}

const nonEmpty = (value: string | null | undefined): string | undefined =>
  value != null && value !== "" ? value : undefined;

/**
 * Groups individual credit grants by the credit they draw from, with summed
 * totals — the shape a credit-usage view renders. Exhausted/zeroed-out grants
 * are included in the per-grant list but their remaining quantity is already 0.
 */
export function groupCreditGrants(
  grants: CreditCompanyGrantView[],
): CreditGroup[] {
  const groups = new Map<string, CreditGroup>();

  for (const grant of grants) {
    let group = groups.get(grant.billingCreditId);
    if (group === undefined) {
      group = {
        creditId: grant.billingCreditId,
        name: grant.creditName,
        singularName: nonEmpty(grant.singularName),
        pluralName: nonEmpty(grant.pluralName),
        description: nonEmpty(grant.creditDescription),
        icon: nonEmpty(grant.creditIcon),
        total: { value: 0, used: 0, remaining: 0 },
        grants: [],
      };
      groups.set(grant.billingCreditId, group);
    }
    group.total.value += grant.quantity;
    group.total.used += grant.quantityUsed;
    group.total.remaining += grant.quantityRemaining;
    group.grants.push(grant);
  }

  return [...groups.values()];
}
