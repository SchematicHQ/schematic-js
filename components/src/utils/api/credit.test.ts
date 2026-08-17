import type { TFunction } from "i18next";
import { describe, expect, it } from "vitest";

import {
  BillingCreditAutoTopupAvailability,
  BillingCreditExpiryType,
  BillingCreditExpiryUnit,
  BillingCreditGrantReason,
  BillingPlanCreditGrantResetCadence,
  BillingPlanCreditGrantResetType,
  PlanCreditGrantScaling,
  type CreditCompanyGrantView,
  type PlanCreditGrantView,
} from "../../api/checkoutexternal";
import {
  aggregateActiveGrantsByBundle,
  aggregateActiveGrantsByCredit,
  deriveCreditBundles,
  filterCreditBundles,
  findLicenseSource,
  formatBundleExpiry,
  getPerLicenseGrantsForFeature,
  getPurchasableCreditIds,
  groupPlanCreditGrants,
  isAutoTopupOff,
  isBundleCompatibleWithPlan,
  isSelfServiceAutoTopupAvailable,
  resolvePlanCreditQuantity,
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

describe("isBundleCompatibleWithPlan", () => {
  it("is true for an unrestricted bundle on any plan, or none", () => {
    expect(isBundleCompatibleWithPlan({ compatiblePlanIds: [] }, "plan-1")).toBe(
      true,
    );
    expect(isBundleCompatibleWithPlan({}, "plan-1")).toBe(true);
    expect(isBundleCompatibleWithPlan({ compatiblePlanIds: [] }, undefined)).toBe(
      true,
    );
  });

  it("is true only for listed plans when enumerated", () => {
    const bundle = { compatiblePlanIds: ["plan-1", "plan-2"] };
    expect(isBundleCompatibleWithPlan(bundle, "plan-1")).toBe(true);
    expect(isBundleCompatibleWithPlan(bundle, "plan-3")).toBe(false);
  });

  it("is false for an enumerated bundle when there is no plan", () => {
    expect(
      isBundleCompatibleWithPlan({ compatiblePlanIds: ["plan-1"] }, undefined),
    ).toBe(false);
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

describe("filterCreditBundles", () => {
  const bundles = [
    { id: "b1", compatiblePlanIds: ["other-plan"], count: 3 },
    { id: "b2", compatiblePlanIds: [], count: 1 },
    { id: "b3", compatiblePlanIds: ["plan-1"], count: 2 },
  ];

  it("drops bundles not compatible with the plan and preserves counts", () => {
    expect(filterCreditBundles(bundles, "plan-1")).toEqual([
      { id: "b2", compatiblePlanIds: [], count: 1 },
      { id: "b3", compatiblePlanIds: ["plan-1"], count: 2 },
    ]);
  });

  it("keeps only unrestricted bundles when there is no plan", () => {
    expect(filterCreditBundles(bundles, undefined)).toEqual([
      { id: "b2", compatiblePlanIds: [], count: 1 },
    ]);
  });

  it("returns an empty list for missing bundles", () => {
    expect(filterCreditBundles(undefined, "plan-1")).toEqual([]);
  });
});

describe("deriveCreditBundles", () => {
  const bundles = [
    { id: "b1", compatiblePlanIds: ["other-plan"] },
    { id: "b2", compatiblePlanIds: [] },
  ];

  it("filters incompatible bundles and applies counts from the map", () => {
    expect(deriveCreditBundles(bundles, "plan-1", { b2: 4 })).toEqual([
      { id: "b2", compatiblePlanIds: [], count: 4 },
    ]);
  });

  it("defaults a surviving bundle's count to 0 when absent from the map", () => {
    expect(deriveCreditBundles(bundles, "plan-1", {})).toEqual([
      { id: "b2", compatiblePlanIds: [], count: 0 },
    ]);
  });
});

describe("getPurchasableCreditIds", () => {
  const bundles = [
    { id: "b1", creditId: "credit-restricted", compatiblePlanIds: ["other"] },
    { id: "b2", creditId: "credit-open", compatiblePlanIds: [] },
    { id: "b3", creditId: "credit-listed", compatiblePlanIds: ["plan-1"] },
  ];

  it("collects credits with at least one bundle purchasable on the plan", () => {
    const ids = getPurchasableCreditIds(bundles, "plan-1");
    expect(ids.has("credit-open")).toBe(true);
    expect(ids.has("credit-listed")).toBe(true);
    expect(ids.has("credit-restricted")).toBe(false);
  });

  it("excludes credits whose only bundles are enumerated when there is no plan", () => {
    const ids = getPurchasableCreditIds(bundles, undefined);
    expect(ids.has("credit-open")).toBe(true);
    expect(ids.has("credit-listed")).toBe(false);
  });

  it("is empty for missing bundles — no bundles means nothing to buy", () => {
    expect(getPurchasableCreditIds(undefined, "plan-1").size).toBe(0);
  });
});

describe("formatBundleExpiry", () => {
  // Stand-in for i18next: echoes the key and interpolates, so assertions read
  // as the composed sentence rather than a mock call log.
  const t = ((key: string, params?: Record<string, unknown>) =>
    key === "expires after purchase"
      ? `expires ${params?.amount} ${params?.unit} after purchase`
      : key) as unknown as TFunction;

  it("describes a duration in days", () => {
    expect(
      formatBundleExpiry(
        {
          expiryType: BillingCreditExpiryType.Duration,
          expiryUnit: BillingCreditExpiryUnit.Days,
          expiryUnitCount: 365,
        },
        t,
      ),
    ).toBe("expires 365 days after purchase");
  });

  it("singularizes a one-unit duration", () => {
    expect(
      formatBundleExpiry(
        {
          expiryType: BillingCreditExpiryType.Duration,
          expiryUnit: BillingCreditExpiryUnit.BillingPeriods,
          expiryUnitCount: 1,
        },
        t,
      ),
    ).toBe("expires 1 billing period after purchase");
  });

  it("returns nothing for a duration with no count, rather than a broken sentence", () => {
    expect(
      formatBundleExpiry(
        {
          expiryType: BillingCreditExpiryType.Duration,
          expiryUnit: BillingCreditExpiryUnit.Days,
          expiryUnitCount: null,
        },
        t,
      ),
    ).toBeUndefined();
  });

  it.each([
    [
      BillingCreditExpiryType.EndOfBillingPeriod,
      "expires at the end of the billing period",
    ],
    [
      BillingCreditExpiryType.EndOfNextBillingPeriod,
      "expires at the end of the next billing period",
    ],
    [BillingCreditExpiryType.EndOfTrial, "expires at the end of the trial"],
  ])("describes %s", (expiryType, expected) => {
    expect(
      formatBundleExpiry(
        {
          expiryType,
          expiryUnit: BillingCreditExpiryUnit.Days,
          expiryUnitCount: null,
        },
        t,
      ),
    ).toBe(expected);
  });

  it("returns nothing when credits never expire", () => {
    expect(
      formatBundleExpiry(
        {
          expiryType: BillingCreditExpiryType.NoExpiry,
          expiryUnit: BillingCreditExpiryUnit.Days,
          expiryUnitCount: null,
        },
        t,
      ),
    ).toBeUndefined();
  });
});

describe("per-license plan credit grants", () => {
  const baseGrant = {
    billingCreditAutoTopupEnabled: false,
    billingCreditAutoTopupSelfService: false,
    billingCreditCanBuyBundles: true,
    companyCreditAmount: 0,
    createdAt: new Date(0),
    creditDescription: "",
    creditId: "credit-1",
    creditName: "Credits",
    id: "grant-fixed",
    planId: "plan-1",
    resetCadence: BillingPlanCreditGrantResetCadence.Monthly,
    resetType: BillingPlanCreditGrantResetType.PlanPeriod,
    rolloverPercentage: 0,
    scaling: PlanCreditGrantScaling.Fixed,
    updatedAt: new Date(0),
  } satisfies Partial<PlanCreditGrantView> as PlanCreditGrantView;

  const fixedGrant: PlanCreditGrantView = {
    ...baseGrant,
    creditAmount: 500,
  };
  const perLicenseGrant: PlanCreditGrantView = {
    ...baseGrant,
    id: "grant-per-license",
    creditAmount: 100,
    licenseId: "license-1",
    scaling: PlanCreditGrantScaling.PerLicense,
  };

  describe("groupPlanCreditGrants", () => {
    it("reads the flat portion off a per-license grant's company amount", () => {
      const [credit] = groupPlanCreditGrants([
        { ...perLicenseGrant, companyCreditAmount: 500 },
      ]);

      expect(credit.fixedQuantity).toBe(500);
      expect(credit.quantity).toBe(500);
      expect(credit.perLicenseGrants).toEqual([
        { amount: 100, licenseId: "license-1" },
      ]);
      expect(credit.period).toBe("month");
    });

    it("ignores the company amount on a fixed grant", () => {
      const [credit] = groupPlanCreditGrants([fixedGrant]);

      expect(credit.fixedQuantity).toBe(500);
      expect(credit.perLicenseGrants).toEqual([]);
    });

    it("combines a per-license and a fixed grant on the same credit", () => {
      const [credit] = groupPlanCreditGrants([perLicenseGrant, fixedGrant]);

      expect(credit.fixedQuantity).toBe(500);
      expect(credit.quantity).toBe(500);
      expect(credit.perLicenseGrants).toEqual([
        { amount: 100, licenseId: "license-1" },
      ]);
      expect(credit.period).toBe("month");
    });

    it("sums multiple fixed grants on the same credit", () => {
      const [credit] = groupPlanCreditGrants([
        fixedGrant,
        { ...fixedGrant, id: "grant-fixed-2", creditAmount: 250 },
      ]);

      expect(credit.fixedQuantity).toBe(750);
      expect(credit.perLicenseGrants).toEqual([]);
    });

    it("treats a per-license grant without a license id as fixed", () => {
      const [credit] = groupPlanCreditGrants([
        { ...perLicenseGrant, licenseId: undefined },
      ]);

      expect(credit.fixedQuantity).toBe(100);
      expect(credit.perLicenseGrants).toEqual([]);
    });
  });

  describe("resolvePlanCreditQuantity", () => {
    const [credit] = groupPlanCreditGrants([perLicenseGrant, fixedGrant]);

    it("computes fixed + per-license × license quantity", () => {
      expect(resolvePlanCreditQuantity(credit, () => 4)).toBe(900);
    });

    it("returns undefined when a license quantity cannot be resolved", () => {
      expect(
        resolvePlanCreditQuantity(credit, () => undefined),
      ).toBeUndefined();
    });

    it("returns the fixed portion when there are no per-license grants", () => {
      const [fixedOnly] = groupPlanCreditGrants([fixedGrant]);

      expect(resolvePlanCreditQuantity(fixedOnly, () => undefined)).toBe(500);
    });
  });

  describe("getPerLicenseGrantsForFeature", () => {
    it("returns per-license grants matching the feature's license", () => {
      expect(
        getPerLicenseGrantsForFeature([perLicenseGrant, fixedGrant], {
          licenseId: "license-1",
        }),
      ).toEqual([perLicenseGrant]);
    });

    it("returns nothing for a feature without a license", () => {
      expect(
        getPerLicenseGrantsForFeature([perLicenseGrant], { licenseId: null }),
      ).toEqual([]);
      expect(getPerLicenseGrantsForFeature([perLicenseGrant])).toEqual([]);
    });
  });

  describe("findLicenseSource", () => {
    const seats = { feature: { licenseId: "license-1" }, quantity: 4 };
    const other = { feature: { licenseId: null }, quantity: 9 };

    it("finds the entitlement whose feature is the license", () => {
      expect(findLicenseSource([other, seats], "license-1")).toBe(seats);
    });

    it("returns undefined without a license id or match", () => {
      expect(findLicenseSource([other, seats], undefined)).toBeUndefined();
      expect(findLicenseSource([other], "license-1")).toBeUndefined();
    });
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

  it("keeps entries in ledger order when keying by credit", () => {
    const result = aggregateActiveGrantsByCredit([
      grant("a", { billingCreditId: "seats", createdAt: new Date(2026, 0, 1) }),
      grant("b", {
        billingCreditId: "tokens",
        createdAt: new Date(2026, 6, 1),
      }),
    ]);

    // Recency reorders the grants inside an entry, never the entries: a credit
    // granted mid-cycle must not jump ahead of the plan's other credits.
    expect(result.map((entry) => entry.id)).toEqual(["seats", "tokens"]);
  });

  it("reads each entry's scalars off its most recent grant", () => {
    const [entry] = aggregateActiveGrantsByBundle([
      grant("old", {
        billingCreditBundleId: "bundle-1",
        quantity: 100,
        createdAt: new Date(2026, 0, 1),
      }),
      grant("new", {
        billingCreditBundleId: "bundle-1",
        quantity: 500,
        createdAt: new Date(2026, 6, 1),
      }),
    ]);

    expect(entry.grants[0].id).toBe("new");
    expect(entry.quantity).toBe(500);
    expect(entry.total.value).toBe(600);
  });

  it("keeps bundles bought two different ways in separate entries", () => {
    const result = aggregateActiveGrantsByBundle([
      grant("purchased", {
        billingCreditBundleId: "bundle-1",
        grantReason: BillingCreditGrantReason.Purchased,
      }),
      grant("topped-up", {
        billingCreditBundleId: "bundle-1",
        grantReason: BillingCreditGrantReason.BillingCreditAutoTopup,
      }),
    ]);

    expect(result).toHaveLength(2);
    expect(result.map((entry) => entry.grantReason).sort()).toEqual([
      BillingCreditGrantReason.BillingCreditAutoTopup,
      BillingCreditGrantReason.Purchased,
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
