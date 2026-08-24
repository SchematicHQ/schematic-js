import {
  entitlement,
  entitlementCredit,
  feature,
  monthly,
  numericEntitlement,
  tieredPrice,
  unlimitedEntitlement,
  usageOf,
  yearly,
} from "../fixtures/builders";

import { deriveEntitlement, deriveUsage } from "./entitlement";

const base = { currency: "usd", locale: "en-US", period: "month" as const };
const apiCalls = feature({
  name: "API call",
  singularName: "API call",
  pluralName: "API calls",
  type: "event",
});

describe("deriveEntitlement", () => {
  test("boolean features render as their name", () => {
    const summary = deriveEntitlement(
      entitlement({ feature: feature({ name: "SSO" }) }),
      base,
    );
    expect(summary.value).toEqual({ kind: "boolean", unit: "SSO" });
  });

  test("numeric event features carry the quantity and metric period", () => {
    const summary = deriveEntitlement(
      numericEntitlement("API call", 1000, { feature: apiCalls }),
      base,
    );
    expect(summary.value).toEqual({
      kind: "numeric",
      quantity: 1000,
      quantityText: "1,000",
      unit: "API calls",
      periodWord: "month",
    });
  });

  test("the warning threshold can stand in for the limit", () => {
    const summary = deriveEntitlement(
      numericEntitlement("API call", 1000, {
        feature: apiCalls,
        warningThreshold: 800,
      }),
      { ...base, showWarningThresholdAsLimit: true },
    );
    expect(summary.value).toMatchObject({ quantity: 800 });
  });

  test("unlimited", () => {
    expect(
      deriveEntitlement(
        unlimitedEntitlement("API call", { feature: apiCalls }),
        base,
      ).value,
    ).toEqual({
      kind: "unlimited",
      unit: "API calls",
    });
  });

  test("pay in advance is priced per unit per period", () => {
    const seats = entitlement({
      feature: feature({
        name: "Seat",
        singularName: "seat",
        pluralName: "seats",
        type: "trait",
      }),
      valueType: "numeric",
      valueNumeric: 5,
      priceBehavior: "pay_in_advance",
      meteredPrices: [monthly(1500), yearly(15000)],
    });
    const summary = deriveEntitlement(seats, { ...base, period: "year" });
    expect(summary.value).toMatchObject({
      kind: "priced",
      perPeriod: true,
      price: { priceText: "$150.00", unit: "seat", period: "year" },
    });
  });

  test("pay as you go is priced per unit without a period", () => {
    const calls = entitlement({
      feature: apiCalls,
      valueType: "numeric",
      priceBehavior: "pay_as_you_go",
      meteredPrices: [monthly(1, "usd")],
    });
    const summary = deriveEntitlement(calls, base);
    expect(summary.value).toMatchObject({
      kind: "priced",
      perPeriod: false,
      price: { priceText: "$0.01" },
    });
  });

  test("packaged prices carry the package size", () => {
    const calls = entitlement({
      feature: apiCalls,
      valueType: "numeric",
      priceBehavior: "pay_as_you_go",
      meteredPrices: [{ ...monthly(1000), packageSize: 1000 }],
    });
    expect(deriveEntitlement(calls, base).value).toMatchObject({
      price: { priceText: "$10.00", packageText: "1,000", unit: "API calls" },
    });
  });

  test("a metered entitlement without a price for the selection is unavailable", () => {
    const calls = entitlement({
      feature: apiCalls,
      priceBehavior: "pay_as_you_go",
      meteredPrices: [monthly(1, "eur")],
    });
    expect(deriveEntitlement(calls, base).value).toEqual({
      kind: "unavailable",
      unit: "API calls",
    });
  });

  test("overage shows the included quantity and the overage rate", () => {
    const calls = entitlement({
      feature: apiCalls,
      valueType: "numeric",
      valueNumeric: 10000,
      priceBehavior: "overage",
      softLimit: 10000,
      metricPeriod: "current_month",
      meteredPrices: [
        tieredPrice([
          [10000, 0],
          [null, 2],
        ]),
      ],
    });
    const summary = deriveEntitlement(calls, base);
    expect(summary.value).toMatchObject({
      kind: "numeric",
      quantityText: "10,000",
      periodWord: "month",
    });
    expect(summary.overage).toMatchObject({
      priceText: "$0.02",
      unit: "API call",
    });
  });

  test("tiered pricing describes the first band and keeps the table", () => {
    const calls = entitlement({
      feature: apiCalls,
      priceBehavior: "tier",
      meteredPrices: [
        tieredPrice([
          [1000, 0],
          [5000, 1],
          [null, 2],
        ]),
      ],
    });
    const summary = deriveEntitlement(calls, base);
    expect(summary.value).toMatchObject({
      kind: "tiered",
      firstTier: { toText: "1,000", unitPriceText: "$0.00" },
    });
    expect(summary.tiers?.rows).toHaveLength(3);
    expect(summary.tiers?.rows[2]).toMatchObject({
      fromText: "5,001",
      toText: null,
      unitPriceText: "$0.02",
    });
  });

  test("credit burndown shows the rate, or the equivalent limit when credits are hidden", () => {
    const images = entitlement({
      feature: feature({
        name: "Image generation",
        singularName: "image generation",
        pluralName: "image generations",
        type: "event",
      }),
      priceBehavior: "credit_burndown",
      credit: entitlementCredit({
        name: "Credits",
        singularName: "credit",
        pluralName: "credits",
        consumptionRate: 2,
        equivalentLimit: 250,
      }),
      metricPeriod: "current_month",
    });
    expect(deriveEntitlement(images, base).value).toEqual({
      kind: "credit_rate",
      rateText: "2",
      creditUnit: "credits",
      unit: "image generation",
    });
    expect(
      deriveEntitlement(images, { ...base, showCredits: false }).value,
    ).toEqual({
      kind: "credit_limit",
      quantityText: "250",
      unit: "image generations",
      periodWord: "month",
    });
  });

  test("hard limits are disclosed only when asked, and only on priced numeric entitlements", () => {
    const calls = entitlement({
      feature: apiCalls,
      valueType: "numeric",
      valueNumeric: 10000,
      priceBehavior: "overage",
      softLimit: 5000,
      meteredPrices: [
        tieredPrice([
          [5000, 0],
          [null, 2],
        ]),
      ],
    });
    expect(deriveEntitlement(calls, base).hardLimit).toBeNull();
    expect(
      deriveEntitlement(calls, { ...base, showHardLimit: true }).hardLimit,
    ).toBe(10000);
    expect(
      deriveEntitlement(numericEntitlement("API call", 1000), {
        ...base,
        showHardLimit: true,
      }).hardLimit,
    ).toBeNull();
  });
});

describe("deriveUsage", () => {
  const opts = { currency: "usd", locale: "en-US", period: "month" as const };

  test("a plain limited feature", () => {
    const row = usageOf(
      numericEntitlement("API call", 1000, { feature: apiCalls }),
      { usage: 250 },
    );
    const summary = deriveUsage(row, opts);
    expect(summary.allocation).toEqual({
      kind: "limit",
      quantity: 1000,
      quantityText: "1,000",
      unit: "API calls",
    });
    expect(summary.usage).toMatchObject({
      usedText: "250",
      limitText: "1,000",
      percent: 25,
      state: "ok",
    });
    expect(summary.showMeter).toBe(true);
    expect(summary.resetsAt).not.toBeNull();
  });

  test("warning precedence: consumer percent, then server threshold, then 90%", () => {
    const row = usageOf(
      numericEntitlement("API call", 1000, {
        feature: apiCalls,
        warningThreshold: 500,
      }),
      { usage: 600 },
    );
    expect(deriveUsage(row, opts).usage.state).toBe("warning");
    expect(deriveUsage(row, { ...opts, warningPercent: 75 }).usage.state).toBe(
      "ok",
    );
    const noThreshold = usageOf(
      numericEntitlement("API call", 1000, { feature: apiCalls }),
      { usage: 850 },
    );
    expect(deriveUsage(noThreshold, opts).usage.state).toBe("ok");
    expect(deriveUsage({ ...noThreshold, usage: 950 }, opts).usage.state).toBe(
      "warning",
    );
  });

  test("over the limit", () => {
    const row = usageOf(
      numericEntitlement("API call", 1000, { feature: apiCalls }),
      { usage: 1200 },
    );
    expect(deriveUsage(row, opts).usage).toMatchObject({
      state: "over",
      percent: 120,
    });
  });

  test("overage reports the units above the soft limit, the rate, and the server cost", () => {
    const ent = entitlement({
      feature: apiCalls,
      valueType: "numeric",
      valueNumeric: 10000,
      priceBehavior: "overage",
      softLimit: 10000,
      meteredPrices: [
        tieredPrice([
          [10000, 0],
          [null, 2],
        ]),
      ],
    });
    const row = usageOf(ent, {
      usage: 12400,
      effectiveLimit: 10000,
      currentCost: 4800,
      currentCostCurrency: "usd",
    });
    const summary = deriveUsage(row, opts);
    expect(summary.overageUnits).toEqual({
      quantity: 2400,
      quantityText: "2,400",
      unit: "API calls",
    });
    expect(summary.unitPrice?.priceText).toBe("$0.02");
    expect(summary.cost?.text).toBe("$48.00");
    expect(summary.usage.state).toBe("over");
  });

  test("pay in advance derives the committed cost from the unit price", () => {
    const seats = entitlement({
      feature: feature({
        name: "Seat",
        singularName: "seat",
        pluralName: "seats",
        type: "trait",
      }),
      valueType: "numeric",
      valueNumeric: 5,
      priceBehavior: "pay_in_advance",
      meteredPrices: [monthly(1500)],
    });
    const summary = deriveUsage(
      usageOf(seats, { usage: 4, effectiveLimit: 5 }),
      opts,
    );
    expect(summary.cost).toEqual({ text: "$75.00", periodShort: "mo" });
    expect(summary.unitPrice?.periodShort).toBe("mo");
    expect(summary.canAddMore).toBe(true);
  });

  test("pay as you go has no meter and a per-unit allocation", () => {
    const calls = entitlement({
      feature: apiCalls,
      priceBehavior: "pay_as_you_go",
      meteredPrices: [monthly(1)],
    });
    const summary = deriveUsage(
      usageOf(calls, { usage: 300, effectiveLimit: null }),
      opts,
    );
    expect(summary.allocation).toMatchObject({ kind: "priced_unit" });
    expect(summary.showMeter).toBe(false);
  });

  test("credit burndown shows the rate, or credits remaining when hidden", () => {
    const images = entitlement({
      feature: feature({
        name: "Image",
        singularName: "image",
        pluralName: "images",
        type: "event",
      }),
      priceBehavior: "credit_burndown",
      credit: entitlementCredit({ consumptionRate: 2, equivalentLimit: 250 }),
    });
    const row = usageOf(images, { usage: 60, effectiveLimit: 250 });
    expect(deriveUsage(row, opts).allocation).toMatchObject({
      kind: "credit_rate",
      rateText: "2",
    });
    expect(
      deriveUsage(row, { ...opts, showCredits: false }).allocation,
    ).toEqual({
      kind: "credit_limit",
      quantityText: "190",
      unit: "images",
    });
    expect(deriveUsage(row, opts).showMeter).toBe(false);
  });

  test("boolean features are not metered", () => {
    const summary = deriveUsage(
      usageOf(entitlement({ feature: feature({ name: "SSO" }) })),
      opts,
    );
    expect(summary.isMetered).toBe(false);
    expect(summary.allocation).toEqual({ kind: "none" });
  });

  test("expiration is carried through", () => {
    const row = usageOf(
      numericEntitlement("API call", 10, { feature: apiCalls }),
      {
        expiresAt: new Date("2026-09-15T12:00:00Z"),
      },
    );
    expect(deriveUsage(row, opts).expiresAt?.text).toMatch(/Sep/);
  });
});
