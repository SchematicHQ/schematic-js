import {
  NOW,
  company,
  companyPlan,
  companySubscription,
  creditBalance,
  creditGrant,
  daysFromNow,
  featureUsage,
  meteredPrice,
} from "../fixtures/builders";
import { SCENARIOS } from "../fixtures/scenarios";

import {
  derivePlanManager,
  type DerivePlanManagerOptions,
} from "./planManager";

const L = "en-US";

function derive(
  data: Partial<Parameters<typeof derivePlanManager>[0]> = {},
  options: Partial<DerivePlanManagerOptions> = {},
) {
  return derivePlanManager(
    {
      company: company(),
      creditBalances: [],
      featureUsage: [],
      ...data,
    },
    { locale: L, now: NOW, ...options },
  );
}

describe("derivePlanManager", () => {
  describe("the notice", () => {
    test("counts a trial down in its largest whole unit", () => {
      const trial = (ms: number) =>
        derive({
          company: company({
            subscription: companySubscription({
              status: "trialing",
              trialEnd: new Date(NOW.getTime() + ms),
            }),
          }),
        }).notice;
      expect(trial(3.5 * 86_400_000)).toEqual({
        kind: "trial",
        endsIn: { amount: 3, unit: "day" },
      });
      expect(trial(5 * 3_600_000)).toMatchObject({
        endsIn: { amount: 5, unit: "hour" },
      });
      expect(trial(90_000)).toMatchObject({
        endsIn: { amount: 1, unit: "minute" },
      });
    });

    test("says a trial ends soon in its last minute, and ended once past", () => {
      const trial = (ms: number) =>
        derive({
          company: company({
            subscription: companySubscription({
              status: "trialing",
              trialEnd: new Date(NOW.getTime() + ms),
            }),
          }),
        }).notice;
      expect(trial(30_000)).toEqual({ kind: "trial", endsIn: "soon" });
      expect(trial(0)).toEqual({ kind: "trial", endsIn: "ended" });
      expect(trial(-2_788_912_000)).toEqual({ kind: "trial", endsIn: "ended" });
    });

    test("reads a cancellation only with both a date and period-end cancelling", () => {
      const cancelling = derive({
        company: company({
          subscription: companySubscription({
            cancelAt: new Date("2026-10-01T12:00:00Z"),
            cancelAtPeriodEnd: true,
            status: "trialing",
          }),
        }),
      }).notice;
      expect(cancelling).toEqual({
        kind: "canceled",
        planName: "Pro",
        date: "October 1, 2026",
      });

      const flagOnly = derive({
        company: company({
          subscription: companySubscription({ cancelAtPeriodEnd: true }),
        }),
      }).notice;
      expect(flagOnly).toBeNull();
    });

    test("dates a custom plan billing and says whether it activates on payment", () => {
      const { notice, canChangePlan } = derive({
        company: company({
          customPlanBilling: {
            activationStrategy: "on_payment",
            dueAt: new Date("2026-09-01T12:00:00Z"),
            invoiceUrl: "https://pay.example/inv",
            planId: "plan_custom",
            planName: "Enterprise",
          },
        }),
      });
      expect(notice).toEqual({
        kind: "customPlanBilling",
        awaitingActivation: true,
        planName: "Enterprise",
        date: "September 1, 2026",
        invoiceUrl: "https://pay.example/inv",
      });
      expect(canChangePlan).toBe(false);
    });

    test("dates a scheduled downgrade by the period end", () => {
      expect(
        derive({
          company: company({
            scheduledDowngrade: {
              fromPlanId: "plan_pro",
              fromPlanName: "Pro",
              toPlanId: "plan_free",
              toPlanName: "Free",
            },
            subscription: companySubscription({
              periodEnd: new Date("2026-09-15T12:00:00Z"),
            }),
          }),
        }).notice,
      ).toEqual({
        kind: "scheduledDowngrade",
        fromPlanName: "Pro",
        toPlanName: "Free",
        date: "September 15, 2026",
      });
    });
  });

  describe("the plan's price", () => {
    test("is billed per the subscription's period, in its currency", () => {
      expect(
        derive({
          company: company({
            subscription: companySubscription({
              currency: "eur",
              period: "year",
            }),
          }),
        }).plan?.price,
      ).toEqual({ kind: "amount", amount: "€29.00", period: "year" });
    });

    test("reads usage-based for a free plan with usage-based features, and free only when asked", () => {
      const free = company({ plan: companyPlan({ price: 0 }) });
      expect(
        derive({
          company: free,
          featureUsage: [featureUsage({ priceBehavior: "pay_as_you_go" })],
        }).plan?.price,
      ).toEqual({ kind: "usageBased" });
      expect(derive({ company: free }).plan?.price).toEqual({
        kind: "amount",
        amount: "$0.00",
        period: null,
      });
      expect(
        derive({ company: free }, { showZeroPriceAsFree: true }).plan?.price,
      ).toEqual({ kind: "free" });
    });

    test("is absent for a plan that is not billed", () => {
      expect(
        derive({
          company: company({ plan: companyPlan({ price: undefined }) }),
        }).plan?.price,
      ).toBeNull();
    });
  });

  test("bills a recurring add-on per the plan's period, a one-time one once", () => {
    const { addOns } = derive({
      company: company({
        addOns: [
          companyPlan({ name: "Seats", period: "month", price: 1000 }),
          companyPlan({ name: "Setup", period: "one-time", price: 50000 }),
          companyPlan({ name: "Gift", price: undefined }),
        ],
        subscription: companySubscription({ period: "year" }),
      }),
    });
    expect(addOns.map((a) => a.price)).toEqual([
      { amount: "$10.00", period: "year" },
      { amount: "$500.00", period: "one-time" },
      null,
    ]);
  });

  describe("usage-based features", () => {
    test("show the limit, the price, and what the allocation costs", () => {
      const { usageBased } = derive({
        featureUsage: SCENARIOS.planManager().featureUsage,
      });
      const byId = Object.fromEntries(usageBased.map((r) => [r.featureId, r]));

      expect(byId.feat_seats).toMatchObject({
        quantity: { amount: "12", units: "Seats" },
        cost: { amount: "$180.00", period: "month" },
      });
      expect(byId.feat_storage).toMatchObject({
        quantity: null,
        unitPrice: {
          cost: "$0.02",
          packageSize: "100",
          units: "GB of storage",
        },
      });
      // The unit price past the soft limit is the last tier's.
      expect(byId.feat_emails).toMatchObject({
        additional: true,
        quantity: { amount: "1,000", units: "Emails" },
        unitPrice: { cost: "$0.05", packageSize: null, units: "Email" },
      });
      expect(byId.feat_builds).toMatchObject({
        tierBased: true,
        quantity: null,
      });
      expect(byId.feat_builds.tiers?.mode).toBe("volume");
      expect(byId.feat_generations.perUse).not.toBeNull();
    });

    test("drop credit-burning features when credits are hidden", () => {
      const rows = [
        featureUsage({
          consumptionRate: 2,
          creditName: "AI credit",
          priceBehavior: "credit_burndown",
          valueType: "credit",
        }),
      ];
      expect(derive({ featureUsage: rows }).usageBased[0].perUse).toEqual({
        amount: "2",
        units: "AI credits",
      });
      expect(
        derive({ featureUsage: rows }, { showCredits: false }).usageBased,
      ).toEqual([]);
    });

    test("leave out features with no price behavior", () => {
      expect(
        derive({ featureUsage: [featureUsage({ priceBehavior: undefined })] })
          .usageBased,
      ).toEqual([]);
    });

    test("prices a trait per period", () => {
      const [row] = derive({
        featureUsage: [
          featureUsage({
            featureType: "trait",
            price: meteredPrice({ price: 300 }),
            priceBehavior: "pay_as_you_go",
          }),
        ],
      }).usageBased;
      expect(row.unitPrice).toMatchObject({ cost: "$3.00", period: "month" });
    });
  });

  describe("credits", () => {
    test("sum the plan's grants of each credit, in the plan's order", () => {
      const { planCredits } = derive({
        company: company({
          plan: companyPlan({ includedCreditIds: ["bcr_b", "bcr_a"] }),
        }),
        creditBalances: [
          creditBalance({
            creditId: "bcr_a",
            grants: [
              creditGrant({ quantity: 100, quantityUsed: 10 }),
              creditGrant({ quantity: 50, quantityUsed: 5 }),
            ],
          }),
          creditBalance({
            creditId: "bcr_b",
            creditName: "Export credit",
            grants: [creditGrant({ quantity: 1, quantityUsed: 0 })],
          }),
          creditBalance({
            creditId: "bcr_c",
            grants: [creditGrant({ grantReason: "purchased" })],
          }),
        ],
      });
      expect(
        planCredits.map((row) => [row.creditId, row.text, row.used]),
      ).toEqual([
        [
          "bcr_b",
          {
            kind: "total",
            amount: "1",
            creditName: "Export credit",
            period: "month",
          },
          null,
        ],
        [
          "bcr_a",
          {
            kind: "total",
            amount: "150",
            creditName: "AI credits",
            period: "month",
          },
          "15",
        ],
      ]);
    });

    test("say per license what a composed credit grants, and how it adds up", () => {
      const [row] = derive(SCENARIOS.planManager()).planCredits;
      expect(row.text).toEqual({
        kind: "perLicense",
        amount: "10",
        creditName: "AI credits",
        licenseName: "Seat",
        plus: { amount: "100", creditName: "AI credits", period: "month" },
      });
      expect(row.composition).toEqual({
        quantity: "12",
        licenseName: "Seats",
        perUnit: "10",
        fixed: "100",
        total: "220",
        creditName: "AI credits",
        period: "month",
      });
      expect(row.autoTopup).toEqual({ amount: "500", threshold: "50" });
    });

    test("list self-service auto top-ups, on or off", () => {
      const view = derive({
        company: company({
          plan: companyPlan({
            includedCreditIds: ["bcr_on", "bcr_off", "bcr_plan"],
          }),
        }),
        creditBalances: [
          creditBalance({
            autoTopup: {
              amount: 500,
              enabled: true,
              selfService: true,
              thresholdCredits: 50,
            },
            creditId: "bcr_on",
          }),
          creditBalance({
            autoTopup: { enabled: false, selfService: true },
            creditId: "bcr_off",
            creditName: "Export credit",
          }),
          creditBalance({
            autoTopup: {
              amount: 1,
              enabled: true,
              selfService: false,
              thresholdCredits: 1,
            },
            creditId: "bcr_plan",
          }),
        ],
      });
      expect(view.autoTopup).toEqual({
        lines: [
          {
            kind: "adds",
            creditId: "bcr_on",
            amount: "500",
            unit: "AI credits",
            threshold: "50",
          },
          { kind: "disabled", creditId: "bcr_off", unit: "Export credit" },
        ],
      });
      expect(derive().autoTopup).toBeNull();
    });

    test("group bought, topped-up and given credits by bundle, newest first", () => {
      const view = derive(SCENARIOS.planManager());
      expect(view.bundles).toEqual([
        {
          key: "purchased:bcb_pack",
          count: 2,
          bundleName: "500 credit pack",
          quantity: "500",
          creditName: "AI credits",
          used: "40",
        },
      ]);
      expect(view.topUps).toMatchObject([
        { count: 2, bundleName: null, quantity: "500", used: "500" },
      ]);
      expect(view.promotional).toMatchObject([
        { count: 1, quantity: "25", creditName: "Export credits", used: "5" },
      ]);
    });

    test("order groups by their newest grant", () => {
      const view = derive({
        creditBalances: [
          creditBalance({
            grants: [
              creditGrant({
                bundleId: "bcb_old",
                createdAt: daysFromNow(-9),
                grantReason: "purchased",
              }),
              creditGrant({
                bundleId: "bcb_new",
                createdAt: daysFromNow(-1),
                grantReason: "purchased",
              }),
            ],
          }),
        ],
      });
      expect(view.bundles.map((row) => row.key)).toEqual([
        "purchased:bcb_new",
        "purchased:bcb_old",
      ]);
    });
  });
});
