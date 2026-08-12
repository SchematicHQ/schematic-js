import type { TFunction } from "i18next";

import type { PreviewSubscriptionDiscountResponseData } from "../api/checkoutexternal";

import { getMonthName } from "./date";
import { formatCurrency, formatOrdinal } from "./string";

export interface SubscriptionDiscountPreview {
  duration: string;
  durationInMonths?: number;
  discountedPrice: string;
}

/**
 * Resolves the single active subscription discount into a discounted recurring
 * total, if one applies cleanly. Returns `undefined` (i.e. show the
 * undiscounted copy) when:
 * - there is no active discount, or several stack (ambiguous to describe);
 * - the discount does not actually reduce the amount; or
 * - an amount-off coupon's currency differs from the plan currency, so the
 *   subtraction would be meaningless.
 */
export function getSubscriptionDiscount(
  discounts: PreviewSubscriptionDiscountResponseData[] | undefined,
  subscriptionTotal: number,
  subscriptionCurrency?: string | null,
): SubscriptionDiscountPreview | undefined {
  const activeDiscounts = (discounts || []).filter(
    (discount) =>
      discount.isActive &&
      ((typeof discount.percentOff === "number" && discount.percentOff > 0) ||
        (typeof discount.amountOff === "number" && discount.amountOff > 0)),
  );

  // Precise preview copy is only well-defined for a single active discount.
  if (activeDiscounts.length !== 1) {
    return undefined;
  }

  const discount = activeDiscounts[0];
  const isPercentOff =
    typeof discount.percentOff === "number" && discount.percentOff > 0;

  // An amount-off coupon is denominated in its own currency; only subtract it
  // from the plan total when the currencies match. Percent-off is agnostic.
  if (
    !isPercentOff &&
    discount.currency &&
    subscriptionCurrency &&
    discount.currency.toLowerCase() !== subscriptionCurrency.toLowerCase()
  ) {
    return undefined;
  }

  // NOTE: percent discounts round once here, whereas Stripe rounds per line
  // item, so the previewed price can differ from the final invoice by a cent.
  const discountedTotal = isPercentOff
    ? subscriptionTotal * (1 - (discount.percentOff as number) / 100)
    : Math.max(0, subscriptionTotal - (discount.amountOff ?? 0));

  // No visible reduction (e.g. an amount-off larger than a $0 plan price).
  if (discountedTotal >= subscriptionTotal) {
    return undefined;
  }

  return {
    duration: discount.duration,
    durationInMonths: discount.durationInMonths ?? undefined,
    // A percent discount can leave fractional minor units (e.g. 40% off
    // $19.99); format at the currency's standard precision so they round
    // away instead of rendering (e.g. "$11.994").
    discountedPrice: formatCurrency(discountedTotal, {
      currency: subscriptionCurrency ?? undefined,
      testSignificantDigits: false,
    }),
  };
}

export interface BillingPreviewParams {
  subscriptionPrice?: string;
  planPeriod: string;
  periodStart?: Date | null;
  hasUsageBasedCosts: boolean;
  discount?: SubscriptionDiscountPreview;
}

/**
 * Builds the "You will be billed …" preview sentence. When a coupon reduces the
 * recurring amount, the copy reflects the discounted price and the window it
 * applies for, then the full price afterward, rather than asserting a single
 * (inaccurate) recurring amount.
 */
export function getBillingPreviewText(
  {
    subscriptionPrice,
    planPeriod,
    periodStart,
    hasUsageBasedCosts,
    discount,
  }: BillingPreviewParams,
  t: TFunction,
): string | null {
  if (!subscriptionPrice) {
    return null;
  }

  // Optional mid-sentence fragments carry a trailing space so they compose
  // cleanly when present and collapse away when empty.
  const usage = hasUsageBasedCosts ? `${t("plus usage based costs")} ` : "";
  const scheduleParts: string[] = [];
  if (periodStart) {
    scheduleParts.push(
      t("on the day", { day: formatOrdinal(periodStart.getDate()) }),
    );
  }
  if (planPeriod === "year" && periodStart) {
    scheduleParts.push(t("of month", { month: getMonthName(periodStart) }));
  }
  const schedule =
    scheduleParts.length > 0 ? `${scheduleParts.join(" ")} ` : "";

  if (!discount) {
    return t("You will be billed", {
      price: subscriptionPrice,
      usage,
      period: planPeriod,
      schedule,
    });
  }

  const { duration, durationInMonths, discountedPrice } = discount;

  // `forever` discounts never expire, so there is no full price afterward.
  if (duration === "forever") {
    return t("You will be billed", {
      price: discountedPrice,
      usage,
      period: planPeriod,
      schedule,
    });
  }

  // A repeating discount applies for a fixed number of months.
  if (duration === "repeating" && durationInMonths) {
    return t("You will be billed with discount window", {
      price: discountedPrice,
      usage,
      period: planPeriod,
      schedule,
      window: t("for the next months", { count: durationInMonths }),
      fullPrice: subscriptionPrice,
    });
  }

  // `once` (or a repeating discount with no month count): the discount applies
  // to the next bill only, so pair it with "on your next bill" rather than the
  // recurring "every {period} {schedule}" clause (which reads awkwardly here).
  return t("You will be billed next bill discount", {
    price: discountedPrice,
    usage,
    period: planPeriod,
    schedule,
    fullPrice: subscriptionPrice,
  });
}
