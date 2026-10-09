import type { Company, FeatureUsage } from "@schematichq/schematic-react";

import { formatCurrency, formatDate, usableDate } from "./format";

/**
 * `deriveUnsubscribe`: what the unsubscribe button and its dialog show —
 * whether there is a subscription to cancel, when access would end, and the
 * plan, add-ons and recurring total that cancelling stops.
 */

export interface UnsubscribeView {
  /**
   * A subscription that is not already set to end, as the embed reads it.
   * The button renders only when this holds.
   */
  canUnsubscribe: boolean;
  /** "October 1, 2026": the cancellation date, else the next bill's, else today. */
  accessEndsOn: string;
  /** A period key: the subscription's, else the plan's, else "month". */
  period: string;
  plan: { name: string; price: string | null } | null;
  addOns: {
    id: string;
    name: string;
    price: string;
    /** Billed once, so outside the recurring total. */
    oneTime: boolean;
  }[];
  /** The plan, the recurring add-ons, and what is paid in advance, per `period`. */
  total: string;
}

export interface DeriveUnsubscribeOptions {
  locale: string;
  /** Stands in for an unknown next bill date. Defaults to now. */
  now?: Date;
}

export function deriveUnsubscribe(
  company: Company,
  featureUsage: FeatureUsage[],
  options: DeriveUnsubscribeOptions,
): UnsubscribeView {
  const { locale } = options;
  const subscription = company.subscription ?? null;
  const currency = subscription?.currency ?? "usd";
  const cancelAt = usableDate(subscription?.cancelAt);
  const endsOn =
    cancelAt ??
    usableDate(subscription?.nextBillAt) ??
    options.now ??
    new Date();
  const money = (amount: number) => formatCurrency(amount, currency, locale);

  const addOns = company.addOns.flatMap((addOn) =>
    typeof addOn.price === "number"
      ? [
          {
            id: addOn.id,
            name: addOn.name,
            price: money(addOn.price),
            oneTime: addOn.period === "one-time",
          },
        ]
      : [],
  );
  const planPrice = company.plan?.price;
  const total =
    (typeof planPrice === "number" ? planPrice : 0) +
    company.addOns.reduce(
      (sum, addOn) =>
        addOn.period !== "one-time" && typeof addOn.price === "number"
          ? sum + addOn.price
          : sum,
      0,
    ) +
    featureUsage.reduce(
      (sum, row) =>
        row.priceBehavior === "pay_in_advance"
          ? sum + (row.currentCost ?? 0)
          : sum,
      0,
    );

  return {
    canUnsubscribe:
      subscription !== null &&
      subscription.status !== "canceled" &&
      cancelAt === undefined,
    accessEndsOn: formatDate(endsOn, locale),
    period: subscription?.period ?? company.plan?.period ?? "month",
    plan:
      company.plan === undefined || company.plan === null
        ? null
        : {
            name: company.plan.name,
            price: typeof planPrice === "number" ? money(planPrice) : null,
          },
    addOns,
    total: money(total),
  };
}
