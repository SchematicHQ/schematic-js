import {
  catalogPlan,
  creditBundle,
  monthly,
  oneTime,
  payInAdvanceEntitlement,
  quarterly,
  yearly,
} from "../fixtures/checkout";

import {
  bundlePrice,
  compatibleWith,
  entitlementPrice,
  periodOfPrice,
  planCurrencies,
  planPeriods,
  planPrice,
} from "./checkoutPrices";

describe("periodOfPrice", () => {
  test("reads a quarter as three months", () => {
    expect(periodOfPrice(monthly(1))).toBe("month");
    expect(periodOfPrice(quarterly(1))).toBe("quarter");
    expect(periodOfPrice(yearly(1))).toBe("year");
    expect(periodOfPrice(oneTime(1))).toBeUndefined();
  });
});

describe("planPrice", () => {
  const eur = monthly(2300, "eur");
  const plan = catalogPlan({
    currencyPrices: [{ currency: "EUR", monthlyPrice: eur }],
    quarterlyPrice: quarterly(7000),
  });

  test("finds the period's price in the currency, case aside", () => {
    expect(planPrice(plan, "month", "USD")).toBe(plan.monthlyPrice);
    expect(planPrice(plan, "quarter", "usd")).toBe(plan.quarterlyPrice);
    expect(planPrice(plan, "month", "eur")).toBe(eur);
  });

  test("never substitutes another period or currency", () => {
    expect(planPrice(plan, "year", "eur")).toBeUndefined();
    expect(planPrice(plan, "month", "gbp")).toBeUndefined();
  });

  test("prices a one-time plan once, whatever the period", () => {
    const once = catalogPlan({
      chargeType: "one_time",
      monthlyPrice: undefined,
      oneTimePrice: oneTime(9900),
      yearlyPrice: undefined,
    });
    expect(planPrice(once, "year", "usd")).toBe(once.oneTimePrice);
  });

  test("lists the periods and currencies a plan is sold in", () => {
    expect(planPeriods(plan)).toEqual(["month", "quarter", "year"]);
    expect(planCurrencies(plan)).toEqual(["usd", "eur"]);
  });
});

describe("entitlementPrice", () => {
  test("finds the metered price for the period in the currency", () => {
    const eur = monthly(450, "eur");
    const seats = payInAdvanceEntitlement({
      currencyPrices: [{ currency: "eur", monthlyPrice: eur }],
    });
    expect(entitlementPrice(seats, "month", "usd")).toBe(
      seats.meteredMonthlyPrice,
    );
    expect(entitlementPrice(seats, "month", "eur")).toBe(eur);
    expect(entitlementPrice(seats, "quarter", "usd")).toBeUndefined();
  });
});

describe("bundlePrice", () => {
  test("prices a fixed bundle per purchase and a custom one per credit", () => {
    const fixed = creditBundle();
    expect(bundlePrice(fixed, "usd")).toBe(fixed.price);
    const custom = creditBundle({
      price: undefined,
      quantity: undefined,
      unitPrice: oneTime(10),
    });
    expect(bundlePrice(custom, "usd")).toBe(custom.unitPrice);
    expect(bundlePrice(custom, "eur")).toBeUndefined();
  });
});

describe("compatibleWith", () => {
  test("reads an absent list as every plan and an empty one as none", () => {
    expect(compatibleWith(undefined, "plan_1")).toBe(true);
    expect(compatibleWith(null, undefined)).toBe(true);
    expect(compatibleWith([], "plan_1")).toBe(false);
    expect(compatibleWith(["plan_1"], "plan_1")).toBe(true);
    expect(compatibleWith(["plan_1"], undefined)).toBe(false);
  });
});
