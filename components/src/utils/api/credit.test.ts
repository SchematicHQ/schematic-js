import { describe, expect, it } from "vitest";

import {
  BillingCreditAutoTopupAvailability,
  type CreditCompanyGrantView,
} from "../../api/checkoutexternal";
import {
  aggregateActiveGrantsByBundle,
  aggregateActiveGrantsByCredit,
  deriveCreditBundles,
  filterCreditBundles,
  getBundleOffCreditIds,
  isAutoTopupOff,
  isBundlePurchaseOff,
  isSelfServiceAutoTopupAvailable,
} from "./credit";

describe("isAutoTopupOff", () => {
  it("returns true when availability is off", () => {
    expect(
      isAutoTopupOff({
        billingCreditAutoTopupAvailability:
          BillingCreditAutoTopupAvailability.Off,
      }),
    ).toBe(true);
  });

  it("returns false for automatic and user_controlled", () => {
    expect(
      isAutoTopupOff({
        billingCreditAutoTopupAvailability:
          BillingCreditAutoTopupAvailability.Automatic,
      }),
    ).toBe(false);
    expect(
      isAutoTopupOff({
        billingCreditAutoTopupAvailability:
          BillingCreditAutoTopupAvailability.UserControlled,
      }),
    ).toBe(false);
  });

  it("treats a missing availability as not off (legacy grants)", () => {
    expect(isAutoTopupOff(undefined)).toBe(false);
    expect(isAutoTopupOff({})).toBe(false);
    expect(isAutoTopupOff({ billingCreditAutoTopupAvailability: null })).toBe(
      false,
    );
  });
});

describe("isBundlePurchaseOff", () => {
  it("returns true when can buy bundles is false", () => {
    expect(isBundlePurchaseOff({ billingCreditCanBuyBundles: false })).toBe(
      true,
    );
  });

  it("returns false when can buy bundles is true", () => {
    expect(isBundlePurchaseOff({ billingCreditCanBuyBundles: true })).toBe(
      false,
    );
  });

  it("treats a missing value as not off (legacy grants)", () => {
    expect(isBundlePurchaseOff(undefined)).toBe(false);
    expect(isBundlePurchaseOff({})).toBe(false);
  });
});

describe("bundle purchase and auto top-up are independent", () => {
  it("bundle purchase off does not imply auto top-up off", () => {
    const grant = {
      billingCreditCanBuyBundles: false,
      billingCreditAutoTopupAvailability:
        BillingCreditAutoTopupAvailability.Automatic,
    };
    expect(isBundlePurchaseOff(grant)).toBe(true);
    expect(isAutoTopupOff(grant)).toBe(false);
  });

  it("auto top-up off does not imply bundle purchase off", () => {
    const grant = {
      billingCreditCanBuyBundles: true,
      billingCreditAutoTopupAvailability:
        BillingCreditAutoTopupAvailability.Off,
    };
    expect(isBundlePurchaseOff(grant)).toBe(false);
    expect(isAutoTopupOff(grant)).toBe(true);
  });
});

describe("isSelfServiceAutoTopupAvailable", () => {
  it("is true only when self-service and not off", () => {
    expect(
      isSelfServiceAutoTopupAvailable({
        billingCreditAutoTopupSelfService: true,
        billingCreditAutoTopupAvailability:
          BillingCreditAutoTopupAvailability.UserControlled,
      }),
    ).toBe(true);
  });

  it("is false when availability is off, even with self-service", () => {
    expect(
      isSelfServiceAutoTopupAvailable({
        billingCreditAutoTopupSelfService: true,
        billingCreditAutoTopupAvailability:
          BillingCreditAutoTopupAvailability.Off,
      }),
    ).toBe(false);
  });

  it("is false without self-service, and for missing grants", () => {
    expect(
      isSelfServiceAutoTopupAvailable({
        billingCreditAutoTopupSelfService: false,
        billingCreditAutoTopupAvailability:
          BillingCreditAutoTopupAvailability.Automatic,
      }),
    ).toBe(false);
    expect(isSelfServiceAutoTopupAvailable(undefined)).toBe(false);
  });
});

describe("getBundleOffCreditIds", () => {
  const grants = [
    { creditId: "credit-off", billingCreditCanBuyBundles: false },
    { creditId: "credit-on", billingCreditCanBuyBundles: true },
    { creditId: "credit-legacy" } as { creditId: string },
  ];

  it("collects only the credit ids whose bundle purchase is off", () => {
    const ids = getBundleOffCreditIds(grants);
    expect(ids.has("credit-off")).toBe(true);
    expect(ids.has("credit-on")).toBe(false);
    expect(ids.has("credit-legacy")).toBe(false);
  });

  it("returns an empty set for missing grants", () => {
    expect(getBundleOffCreditIds(undefined).size).toBe(0);
  });
});

describe("filterCreditBundles", () => {
  const grants = [
    { creditId: "credit-off", billingCreditCanBuyBundles: false },
    { creditId: "credit-on", billingCreditCanBuyBundles: true },
  ];
  const bundles = [
    { id: "b1", creditId: "credit-off", count: 3 },
    { id: "b2", creditId: "credit-on", count: 1 },
  ];

  it("drops bundles whose credit is bundle-off and preserves counts", () => {
    expect(filterCreditBundles(grants, bundles)).toEqual([
      { id: "b2", creditId: "credit-on", count: 1 },
    ]);
  });

  it("filters nothing when grants are missing (helper fails open)", () => {
    expect(filterCreditBundles(undefined, bundles)).toEqual(bundles);
  });
});

describe("deriveCreditBundles", () => {
  const grants = [
    { creditId: "credit-off", billingCreditCanBuyBundles: false },
    { creditId: "credit-on", billingCreditCanBuyBundles: true },
  ];
  const bundles = [
    { id: "b1", creditId: "credit-off" },
    { id: "b2", creditId: "credit-on" },
  ];

  it("filters bundle-off credits and applies counts from the map", () => {
    expect(deriveCreditBundles(grants, bundles, { b2: 4 })).toEqual([
      { id: "b2", creditId: "credit-on", count: 4 },
    ]);
  });

  it("defaults a surviving bundle's count to 0 when absent from the map", () => {
    expect(deriveCreditBundles(grants, bundles, {})).toEqual([
      { id: "b2", creditId: "credit-on", count: 0 },
    ]);
  });
});

describe("aggregating active grants", () => {
  const grant = (id: string, overrides: Partial<CreditCompanyGrantView> = {}) =>
    ({
      id,
      billingCreditId: "tokens",
      billingCreditBundleId: null,
      creditName: "Tokens",
      quantity: 100,
      quantityRemaining: 60,
      quantityUsed: 40,
      createdAt: new Date(2026, 0, 1),
      expiresAt: null,
      zeroedOutDate: null,
      ...overrides,
    }) as unknown as CreditCompanyGrantView;

  it("returns each entry's grants newest-first", () => {
    const result = aggregateActiveGrantsByCredit([
      grant("b", { createdAt: new Date(2026, 3, 1) }),
      grant("c", { createdAt: new Date(2026, 6, 1) }),
      grant("a", { createdAt: new Date(2026, 0, 1) }),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].grants.map((g) => g.id)).toEqual(["c", "b", "a"]);
  });

  it("returns entries newest-first by their most recent grant", () => {
    const result = aggregateActiveGrantsByBundle([
      grant("old-a", {
        billingCreditBundleId: "stale",
        createdAt: new Date(2026, 0, 1),
      }),
      grant("new", {
        billingCreditBundleId: "fresh",
        createdAt: new Date(2026, 6, 1),
      }),
      grant("mid", {
        billingCreditBundleId: "middling",
        createdAt: new Date(2026, 3, 1),
      }),
      // A second, newer grant promotes the otherwise-stale bundle to the front.
      grant("new-a", {
        billingCreditBundleId: "stale",
        createdAt: new Date(2026, 9, 1),
      }),
    ]);

    expect(result.map((entry) => entry.bundleId)).toEqual([
      "stale",
      "fresh",
      "middling",
    ]);
  });

  it("does not mutate the grants it is given", () => {
    const grants = [
      grant("b", { createdAt: new Date(2026, 3, 1) }),
      grant("a", { createdAt: new Date(2026, 6, 1) }),
    ];

    aggregateActiveGrantsByCredit(grants);

    expect(grants.map((g) => g.id)).toEqual(["b", "a"]);
  });

  it("drops expired and zeroed-out grants and sums the rest", () => {
    const result = aggregateActiveGrantsByCredit([
      grant("live"),
      grant("expired", { expiresAt: new Date(2020, 0, 1) }),
      grant("zeroed", { zeroedOutDate: new Date(2026, 0, 2) }),
      grant("also-live"),
    ]);

    expect(result[0].grants.map((g) => g.id).sort()).toEqual([
      "also-live",
      "live",
    ]);
    expect(result[0].total).toEqual({ value: 200, remaining: 120, used: 80 });
  });

  it("collapses one entry per credit regardless of bundle", () => {
    const result = aggregateActiveGrantsByCredit([
      grant("a", { billingCreditBundleId: "bundle-1" }),
      grant("b", { billingCreditBundleId: "bundle-2" }),
      grant("c", { billingCreditId: "seats", billingCreditBundleId: null }),
    ]);

    expect(result).toHaveLength(2);
  });

  it("keys by bundle, falling back to grant id when there is none", () => {
    const result = aggregateActiveGrantsByBundle([
      grant("a", { billingCreditBundleId: "bundle-1" }),
      grant("b", { billingCreditBundleId: "bundle-1" }),
      grant("c", { billingCreditBundleId: null }),
    ]);

    expect(result).toHaveLength(2);
    const bundled = result.find((entry) => entry.bundleId === "bundle-1");
    expect(bundled?.grants.map((g) => g.id).sort()).toEqual(["a", "b"]);
    expect(bundled?.total.value).toBe(200);
  });
});
