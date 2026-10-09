import {
  NOW,
  company,
  companyPlan,
  companySubscription,
  featureUsage,
} from "../fixtures/builders";

import { deriveUnsubscribe } from "./unsubscribe";

const L = "en-US";

describe("deriveUnsubscribe", () => {
  test("offers to cancel a subscription not yet set to end", () => {
    expect(deriveUnsubscribe(company(), [], { locale: L }).canUnsubscribe).toBe(
      true,
    );
    expect(
      deriveUnsubscribe(company({ subscription: undefined }), [], {
        locale: L,
      }).canUnsubscribe,
    ).toBe(false);
    expect(
      deriveUnsubscribe(
        company({
          subscription: companySubscription({ cancelAt: NOW }),
        }),
        [],
        { locale: L },
      ).canUnsubscribe,
    ).toBe(false);
  });

  test("ends access at the next bill, else today", () => {
    expect(
      deriveUnsubscribe(
        company({
          subscription: companySubscription({
            nextBillAt: new Date("2026-09-01T12:00:00Z"),
          }),
        }),
        [],
        { locale: L },
      ).accessEndsOn,
    ).toBe("September 1, 2026");
    expect(
      deriveUnsubscribe(
        company({
          subscription: companySubscription({ nextBillAt: undefined }),
        }),
        [],
        { locale: L, now: NOW },
      ).accessEndsOn,
    ).toBe("August 21, 2026");
  });

  test("totals the plan, recurring add-ons and what is paid in advance", () => {
    const view = deriveUnsubscribe(
      company({
        addOns: [
          companyPlan({ id: "plan_seats", name: "Seats", price: 1000 }),
          companyPlan({
            id: "plan_setup",
            name: "Setup",
            period: "one-time",
            price: 50000,
          }),
          companyPlan({ id: "plan_free", name: "Gift", price: undefined }),
        ],
        subscription: companySubscription({ period: "year" }),
      }),
      [
        featureUsage({ currentCost: 18000, priceBehavior: "pay_in_advance" }),
        featureUsage({ currentCost: 26, priceBehavior: "pay_as_you_go" }),
      ],
      { locale: L },
    );
    expect(view.period).toBe("year");
    expect(view.plan).toEqual({ name: "Pro", price: "$29.00" });
    expect(view.addOns).toEqual([
      { id: "plan_seats", name: "Seats", price: "$10.00", oneTime: false },
      { id: "plan_setup", name: "Setup", price: "$500.00", oneTime: true },
    ]);
    // 2900 + 1000 + 18000; the one-time add-on and the usage are not recurring.
    expect(view.total).toBe("$219.00");
  });
});
