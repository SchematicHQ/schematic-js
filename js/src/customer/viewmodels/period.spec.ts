import { describe, expect, it } from "vitest";

import { PlanPriceCadence } from "../api/public";

import {
  derivePeriod,
  offeredPeriods,
  periodFromCadence,
  pricePeriod,
  PricePeriod,
} from "./period";
import { price } from "./fixtures";

describe("derivePeriod", () => {
  it("maps the provider interval encoding to a display period", () => {
    expect(derivePeriod("month", 1)).toBe(PricePeriod.Month);
    expect(derivePeriod("month", 3)).toBe(PricePeriod.Quarter);
    expect(derivePeriod("year", 1)).toBe(PricePeriod.Year);
    expect(derivePeriod("one-time", 1)).toBe(PricePeriod.OneTime);
  });

  it("returns undefined for cadences the catalog never sells", () => {
    expect(derivePeriod("day", 1)).toBeUndefined();
    expect(derivePeriod(undefined, undefined)).toBeUndefined();
    expect(derivePeriod(null, null)).toBeUndefined();
  });

  it("reads a price's period from its interval fields", () => {
    expect(pricePeriod(price({ price: 1, period: PricePeriod.Quarter }))).toBe(
      PricePeriod.Quarter,
    );
    expect(pricePeriod({ interval: "day", intervalCount: 1 })).toBe(
      PricePeriod.Month,
    );
  });
});

describe("offeredPeriods", () => {
  it("maps cadences and appends one-time when a one-time price exists", () => {
    expect(periodFromCadence(PlanPriceCadence.Quarterly)).toBe(
      PricePeriod.Quarter,
    );
    expect(
      offeredPeriods({
        availablePeriods: [PlanPriceCadence.Monthly, PlanPriceCadence.Yearly],
      }),
    ).toEqual([PricePeriod.Month, PricePeriod.Year]);
    expect(
      offeredPeriods({
        availablePeriods: [],
        oneTimePrice: price({ price: 5, period: PricePeriod.OneTime }),
      }),
    ).toEqual([PricePeriod.OneTime]);
  });
});
