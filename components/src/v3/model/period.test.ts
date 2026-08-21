import { derivePeriod, monthsInPeriod, periodFromCadence } from "./period";

describe("derivePeriod", () => {
  test.each([
    ["month", 1, "month"],
    ["month", 3, "quarter"],
    ["month", 12, "year"],
    ["year", 1, "year"],
    ["one-time", 1, "one_time"],
  ] as const)("%s × %i → %s", (interval, count, expected) => {
    expect(derivePeriod(interval, count)).toBe(expected);
  });

  test("unsupported cadences yield null rather than a mislabel", () => {
    expect(derivePeriod("week", 1)).toBeNull();
    expect(derivePeriod("day", 1)).toBeNull();
    expect(derivePeriod("month", 6)).toBeNull();
    expect(derivePeriod("year", 2)).toBeNull();
  });

  test("defaults the count to 1", () => {
    expect(derivePeriod("month")).toBe("month");
  });
});

test("periodFromCadence maps the API cadence vocabulary", () => {
  expect(periodFromCadence("monthly")).toBe("month");
  expect(periodFromCadence("quarterly")).toBe("quarter");
  expect(periodFromCadence("yearly")).toBe("year");
});

test("monthsInPeriod", () => {
  expect(monthsInPeriod("month")).toBe(1);
  expect(monthsInPeriod("quarter")).toBe(3);
  expect(monthsInPeriod("year")).toBe(12);
  expect(monthsInPeriod("one_time")).toBe(0);
});
