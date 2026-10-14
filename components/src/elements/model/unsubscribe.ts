import type { Company, FeatureUsage } from "@schematichq/schematic-react";

import { formatCurrency, formatDate, usableDate } from "./format";

export interface UnsubscribeView {
  /** A subscription exists and is not already set to end. */
  canUnsubscribe: boolean;
  accessEndsOn: string;
  period: string;
  plan: { name: string; price: string | null } | null;
  addOns: {
    id: string;
    name: string;
    price: string;
    /** Left out of the recurring total. */
    oneTime: boolean;
  }[];
  /** Recurring cost per `period`: the plan, recurring add-ons, and pay-in-advance usage. */
  total: string;
}

export interface DeriveUnsubscribeOptions {
  locale: string;
  /** Used when the next bill date is unknown. Defaults to now. */
  now?: Date;
}

/**
 * Whether there is a subscription to cancel, when access ends, and what
 * cancelling stops charging for.
 */
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
    canUnsubscribe: subscription !== null && cancelAt === undefined,
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
