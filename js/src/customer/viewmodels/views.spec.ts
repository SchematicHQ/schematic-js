import { describe, expect, it } from "vitest";

import {
  type CompanyContextResponseData,
  type CompanyFeatureUsageResponseData,
} from "../api/customer";

import { deriveCreditBalances } from "./credits";
import { deriveInvoiceList, deriveUpcomingInvoice } from "./invoices";
import { PricePeriod } from "./period";
import { derivePlanSummary } from "./summary";
import { deriveUsage } from "./usage";
import { price } from "./fixtures";

const usageRow = (
  overrides: Partial<CompanyFeatureUsageResponseData>,
): CompanyFeatureUsageResponseData =>
  ({
    access: true,
    currencyPrices: [],
    featureDescription: "",
    featureIcon: "",
    featureId: "feat_1",
    featureName: "API calls",
    featureType: "event",
    source: "plan",
    usage: 0,
    valueType: "numeric",
    ...overrides,
  }) as CompanyFeatureUsageResponseData;

describe("deriveUsage", () => {
  it("uses the server's effective limit and percent", () => {
    const vm = deriveUsage(
      usageRow({
        effectiveLimit: 80,
        percentUsed: 75,
        usage: 60,
        valueNumeric: 100,
      }),
      { locale: "en-US" },
    );
    expect(vm.limit).toBe(80);
    expect(vm.percent).toBe(75);
    expect(vm.state).toBe("ok");
    expect(vm.entitlement.kind).toBe("numeric");
  });

  it("flags warning and over-limit states", () => {
    const warning = deriveUsage(usageRow({ usage: 95, valueNumeric: 100 }));
    expect(warning.state).toBe("warning");

    const over = deriveUsage(
      usageRow({ access: false, usage: 120, valueNumeric: 100 }),
    );
    expect(over.state).toBe("over_limit");
    expect(over.percent).toBe(100);
  });

  it("applies the entitlement's own warning threshold when the consumer sets none", () => {
    const vm = deriveUsage(
      usageRow({ usage: 50, valueNumeric: 100, warningThreshold: 40 }),
    );
    expect(vm.state).toBe("warning");
  });

  it("lets a consumer warningPercent win over the entitlement's threshold", () => {
    const row = usageRow({
      usage: 50,
      valueNumeric: 100,
      warningThreshold: 40,
    });
    expect(deriveUsage(row, { warningPercent: 75 }).state).toBe("ok");
    expect(deriveUsage(row, { warningPercent: 50 }).state).toBe("warning");
  });

  it("formats the current cost in the selected currency's metered price", () => {
    const row = usageRow({
      currencyPrices: [
        {
          currency: "eur",
          monthlyPrice: price({
            currency: "eur",
            period: PricePeriod.Month,
            price: 20,
          }),
        },
      ],
      currentCost: 1250,
      meteredMonthlyPrice: price({ period: PricePeriod.Month, price: 25 }),
      priceBehavior: "pay_as_you_go",
      usage: 50,
    });
    expect(deriveUsage(row, { locale: "en-US" }).formattedCurrentCost).toBe(
      "$12.50",
    );
    expect(
      deriveUsage(row, { currency: "eur", locale: "en-US" })
        .formattedCurrentCost,
    ).toBe("€12.50");
  });

  it("formats the precomputed current cost in the metered price currency", () => {
    const vm = deriveUsage(
      usageRow({
        currentCost: 1250,
        meteredMonthlyPrice: price({
          currency: "eur",
          period: PricePeriod.Month,
          price: 25,
        }),
        priceBehavior: "pay_as_you_go",
        usage: 50,
      }),
      { locale: "en-US" },
    );
    expect(vm.formattedCurrentCost).toBe("€12.50");
  });

  it("derives overuse from the soft limit on overage entitlements", () => {
    const vm = deriveUsage(
      usageRow({ priceBehavior: "overage", softLimit: 100, usage: 130 }),
    );
    expect(vm.overuse).toBe(30);
    expect(vm.state).toBe("over_limit");
  });
});

describe("deriveCreditBalances", () => {
  it("computes burndown percentages and keeps grant sources structured", () => {
    const [vm] = deriveCreditBalances(
      [
        {
          creditDescription: "",
          creditId: "bcrd_1",
          creditName: "AI Credits",
          expiresAt: new Date("2026-12-31T00:00:00Z"),
          grants: [
            {
              createdAt: new Date("2026-01-01T00:00:00Z"),
              grantReason: "plan",
              id: "bcgr_1",
              planId: "plan_1",
              planName: "Starter",
              quantity: 100,
              quantityRemaining: 25,
              quantityUsed: 75,
              validFrom: null,
            },
            {
              bundleId: "bndl_1",
              bundleName: "Top-up 500",
              createdAt: new Date("2026-02-01T00:00:00Z"),
              grantReason: "bundle",
              id: "bcgr_2",
              quantity: 500,
              quantityRemaining: 500,
              quantityUsed: 0,
              validFrom: null,
            },
          ],
          remaining: 525,
          total: 600,
          used: 75,
        },
      ],
      { locale: "en-US" },
    );
    expect(vm.percentUsed).toBe(12.5);
    expect(vm.formattedRemaining).toBe("525");
    expect(vm.formattedExpiresAt).toContain("2026");
    expect(vm.grants[0].source).toEqual({
      planId: "plan_1",
      planName: "Starter",
      reason: "plan",
    });
    expect(vm.grants[1].source.bundleName).toBe("Top-up 500");
  });
});

describe("deriveInvoiceList", () => {
  it("formats amounts with accounting negatives and falls back to createdAt", () => {
    const rows = deriveInvoiceList(
      [
        {
          amountDue: 12345,
          createdAt: new Date("2026-02-01T00:00:00Z"),
          currency: "usd",
          dueDate: new Date("2026-03-01T00:00:00Z"),
          id: "inv_1",
          status: "paid",
        },
        {
          amountDue: -5000,
          createdAt: new Date("2026-01-15T00:00:00Z"),
          currency: "usd",
          id: "inv_2",
        },
      ],
      { locale: "en-US" },
    );
    expect(rows[0].formattedAmount).toBe("$123.45");
    expect(rows[0].formattedDate).toContain("2026");
    expect(rows[1].formattedAmount).toBe("($50.00)");
    expect(rows[1].date).toEqual(new Date("2026-01-15T00:00:00Z"));
  });
});

describe("deriveUpcomingInvoice", () => {
  it("formats totals, applied balance, and discounts", () => {
    const vm = deriveUpcomingInvoice(
      {
        amountDue: 4000,
        currency: "usd",
        customerBalanceApplied: 1000,
        customerBalanceRemaining: 500,
        discounts: [
          {
            couponName: "LAUNCH",
            duration: "repeating",
            durationInMonths: 3,
            percentOff: 50,
          },
        ],
        dueDate: new Date("2026-03-01T00:00:00Z"),
        subtotal: 10000,
      },
      { locale: "en-US" },
    );
    expect(vm.formattedAmountDue).toBe("$40.00");
    expect(vm.formattedBalanceApplied).toBe("$10.00");
    expect(vm.formattedBalanceRemaining).toBe("$5.00");
    expect(vm.discounts[0]).toMatchObject({
      couponName: "LAUNCH",
      percentOff: 50,
      durationInMonths: 3,
    });
  });
});

describe("derivePlanSummary", () => {
  const company = (
    overrides: Partial<CompanyContextResponseData>,
  ): CompanyContextResponseData => ({
    addOns: [],
    id: "comp_1",
    name: "Acme",
    ...overrides,
  });
  const subscription = (
    overrides: Partial<NonNullable<CompanyContextResponseData["subscription"]>>,
  ): NonNullable<CompanyContextResponseData["subscription"]> => ({
    cancelAtPeriodEnd: false,
    currency: "usd",
    currentPeriodEnd: new Date("2026-09-01T00:00:00Z"),
    currentPeriodStart: new Date("2026-08-01T00:00:00Z"),
    id: "bsub_1",
    interval: "month",
    intervalCount: 1,
    status: "active",
    totalPrice: 5000,
    trialing: false,
    ...overrides,
  });

  it("prices the current plan from its subscription line item", () => {
    const vm = derivePlanSummary(
      {
        company: company({
          plan: {
            description: "",
            icon: "",
            id: "plan_1",
            isAddOn: false,
            isCustom: false,
            name: "Pro",
            price: price({ price: 5000, period: PricePeriod.Month }),
          },
          subscription: subscription({}),
        }),
      },
      { locale: "en-US" },
    );
    expect(vm.currentPlan?.formattedPrice).toBe("$50.00");
    expect(vm.currentPlan?.period).toBe(PricePeriod.Month);
    expect(vm.subscription?.formattedTotalPrice).toBe("$50.00");
    expect(vm.subscription?.period).toBe(PricePeriod.Month);
    expect(vm.notice).toBeUndefined();
  });

  it("surfaces the trial notice with the catalog's post-trial plan", () => {
    const vm = derivePlanSummary(
      {
        catalog: { trialExpiryPlan: { id: "plan_2", name: "Starter" } },
        company: company({
          subscription: subscription({
            status: "trialing",
            trialEnd: new Date("2026-09-01T00:00:00Z"),
            trialing: true,
          }),
        }),
      },
      { locale: "en-US" },
    );
    expect(vm.notice?.kind).toBe("trialing");
    if (vm.notice?.kind === "trialing") {
      expect(vm.notice.postTrialPlan?.name).toBe("Starter");
      expect(vm.notice.trialEndsAt).toEqual(new Date("2026-09-01T00:00:00Z"));
    }
  });

  it("prioritizes cancellation over a scheduled downgrade", () => {
    const vm = derivePlanSummary({
      company: company({
        scheduledDowngrade: {
          currency: "usd",
          effectiveAt: new Date("2026-10-01T00:00:00Z"),
          plan: { id: "plan_2", name: "Starter" },
        },
        subscription: subscription({
          cancelAt: new Date("2026-10-01T00:00:00Z"),
          cancelAtPeriodEnd: true,
        }),
      }),
    });
    expect(vm.notice?.kind).toBe("will_cancel");
  });

  it("falls through to the pending custom-plan invoice, then the downgrade", () => {
    const pending = derivePlanSummary({
      company: company({
        customBilling: {
          activationStrategy: "on_payment",
          daysUntilDue: 30,
          id: "cpbl_1",
          invoiceUrl: "https://invoice.example",
          planId: "plan_1",
          sendInvoice: true,
          status: "pending",
        },
        scheduledDowngrade: {
          currency: "usd",
          effectiveAt: new Date("2026-10-01T00:00:00Z"),
          plan: { id: "plan_2", name: "Starter" },
        },
      }),
    });
    expect(pending.notice?.kind).toBe("custom_plan_pending");

    const downgrade = derivePlanSummary({
      company: company({
        scheduledDowngrade: {
          currency: "usd",
          effectiveAt: new Date("2026-10-01T00:00:00Z"),
          plan: { id: "plan_2", name: "Starter" },
          price: 1000,
        },
      }),
    });
    expect(downgrade.notice?.kind).toBe("scheduled_downgrade");
    if (downgrade.notice?.kind === "scheduled_downgrade") {
      expect(downgrade.notice.toPlanName).toBe("Starter");
      expect(downgrade.notice.formattedPrice).toBe("$10.00");
    }
  });
});
