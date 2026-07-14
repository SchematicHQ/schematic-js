import { describe, expect, test } from "vitest";

import type { PreviewSubscriptionDiscountResponseData } from "../api/checkoutexternal";
import { i18n } from "../localization/i18n";

import { getBillingPreviewText, getSubscriptionDiscount } from "./discount";

function makeDiscount(
  overrides: Partial<PreviewSubscriptionDiscountResponseData>,
): PreviewSubscriptionDiscountResponseData {
  return {
    couponName: "Coupon",
    duration: "repeating",
    isActive: true,
    startedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

// periodStart with a getDate() of 3, in January (for yearly schedule copy).
const JAN_3 = new Date(2026, 0, 3);

describe("getSubscriptionDiscount", () => {
  test("amount-off: subtracts the coupon amount from the plan total", () => {
    const result = getSubscriptionDiscount(
      [
        makeDiscount({
          amountOff: 10000,
          currency: "usd",
          duration: "repeating",
          durationInMonths: 6,
        }),
      ],
      20000,
      "usd",
    );

    expect(result).toEqual({
      duration: "repeating",
      durationInMonths: 6,
      discountedPrice: "$100.00",
    });
  });

  test("percent-off: scales the plan total", () => {
    const result = getSubscriptionDiscount(
      [makeDiscount({ percentOff: 50, duration: "forever" })],
      20000,
      "usd",
    );

    expect(result?.discountedPrice).toBe("$100.00");
    expect(result?.duration).toBe("forever");
    expect(result?.durationInMonths).toBeUndefined();
  });

  test("ignores inactive discounts", () => {
    expect(
      getSubscriptionDiscount(
        [makeDiscount({ amountOff: 10000, currency: "usd", isActive: false })],
        20000,
        "usd",
      ),
    ).toBeUndefined();
  });

  test("ignores zeroed discounts (the '0% off' case)", () => {
    expect(
      getSubscriptionDiscount(
        [makeDiscount({ percentOff: 0, amountOff: 0 })],
        20000,
        "usd",
      ),
    ).toBeUndefined();
  });

  test("bails when multiple discounts stack (ambiguous copy)", () => {
    expect(
      getSubscriptionDiscount(
        [
          makeDiscount({ couponName: "a", amountOff: 5000, currency: "usd" }),
          makeDiscount({ couponName: "b", percentOff: 10 }),
        ],
        20000,
        "usd",
      ),
    ).toBeUndefined();
  });

  test("bails on amount-off when the coupon currency differs from the plan", () => {
    expect(
      getSubscriptionDiscount(
        [makeDiscount({ amountOff: 10000, currency: "eur" })],
        20000,
        "usd",
      ),
    ).toBeUndefined();
  });

  test("applies percent-off regardless of currency", () => {
    const result = getSubscriptionDiscount(
      [makeDiscount({ percentOff: 25, currency: "eur", duration: "forever" })],
      20000,
      "usd",
    );

    expect(result?.discountedPrice).toBe("$150.00");
  });

  test("bails when there is no visible reduction (e.g. $0 plan)", () => {
    expect(
      getSubscriptionDiscount(
        [makeDiscount({ amountOff: 10000, currency: "usd" })],
        0,
        "usd",
      ),
    ).toBeUndefined();
  });
});

describe("getBillingPreviewText", () => {
  const t = i18n.t;

  test("returns null without a subscription price", () => {
    expect(
      getBillingPreviewText(
        {
          subscriptionPrice: undefined,
          planPeriod: "month",
          periodStart: JAN_3,
          hasUsageBasedCosts: false,
        },
        t,
      ),
    ).toBeNull();
  });

  test("no discount: states the full recurring amount", () => {
    expect(
      getBillingPreviewText(
        {
          subscriptionPrice: "$200.00",
          planPeriod: "month",
          periodStart: JAN_3,
          hasUsageBasedCosts: false,
        },
        t,
      ),
    ).toBe(
      "You will be billed $200.00 for this subscription every month on the 3rd unless you unsubscribe.",
    );
  });

  test("no discount: includes usage-based costs when present", () => {
    const text = getBillingPreviewText(
      {
        subscriptionPrice: "$200.00",
        planPeriod: "month",
        periodStart: JAN_3,
        hasUsageBasedCosts: true,
      },
      t,
    );

    expect(text).toContain("plus usage based costs");
  });

  test("no discount: yearly plan includes the month", () => {
    const text = getBillingPreviewText(
      {
        subscriptionPrice: "$2000.00",
        planPeriod: "year",
        periodStart: JAN_3,
        hasUsageBasedCosts: false,
      },
      t,
    );

    expect(text).toContain("every year on the 3rd of January");
  });

  test("repeating discount: discounted window then full price afterward", () => {
    expect(
      getBillingPreviewText(
        {
          subscriptionPrice: "$200.00",
          planPeriod: "month",
          periodStart: JAN_3,
          hasUsageBasedCosts: false,
          discount: {
            duration: "repeating",
            durationInMonths: 6,
            discountedPrice: "$100.00",
          },
        },
        t,
      ),
    ).toBe(
      "You will be billed $100.00 for this subscription every month on the 3rd for the next 6 months, then $200.00 every month afterward, unless you unsubscribe.",
    );
  });

  test("repeating discount: singular month copy", () => {
    const text = getBillingPreviewText(
      {
        subscriptionPrice: "$200.00",
        planPeriod: "month",
        periodStart: JAN_3,
        hasUsageBasedCosts: false,
        discount: {
          duration: "repeating",
          durationInMonths: 1,
          discountedPrice: "$100.00",
        },
      },
      t,
    );

    expect(text).toContain("for the next month,");
    expect(text).not.toContain("1 month");
  });

  test("forever discount: no full-price-afterward clause", () => {
    const text = getBillingPreviewText(
      {
        subscriptionPrice: "$200.00",
        planPeriod: "month",
        periodStart: JAN_3,
        hasUsageBasedCosts: false,
        discount: {
          duration: "forever",
          discountedPrice: "$100.00",
        },
      },
      t,
    );

    expect(text).toBe(
      "You will be billed $100.00 for this subscription every month on the 3rd unless you unsubscribe.",
    );
    expect(text).not.toContain("then");
  });

  test("once discount: applies to the next bill only", () => {
    expect(
      getBillingPreviewText(
        {
          subscriptionPrice: "$200.00",
          planPeriod: "month",
          periodStart: JAN_3,
          hasUsageBasedCosts: false,
          discount: {
            duration: "once",
            discountedPrice: "$100.00",
          },
        },
        t,
      ),
    ).toBe(
      "You will be billed $100.00 for this subscription on your next bill, then $200.00 every month on the 3rd afterward, unless you unsubscribe.",
    );
  });
});
