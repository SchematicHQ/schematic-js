import type { CompanyContext } from "../contract";
import {
  NOW,
  checkoutBehavior,
  company,
  creditAutoTopup,
  daysFromNow,
  heldPlan,
  monthly,
  scheduledDowngrade,
  subscription,
  withId,
  yearly,
} from "../fixtures/builders";
import {
  cancelingSubscription,
  freeAddOn,
  oneTimeAddOn,
  paymentActivatedCompany,
  proCompanyContext,
  seatAddOn,
  trialSubscription,
} from "../fixtures/company";
import { proCompanyCatalog } from "../fixtures/scenarios";

import { formatDate } from "./format";
import { derivePlanSummary, timeRemaining } from "./summary";

const L = "en-US";

function summarize(
  comp: CompanyContext,
  options: Partial<Parameters<typeof derivePlanSummary>[1]> = {},
  catalog = proCompanyCatalog(),
) {
  return derivePlanSummary(
    { company: comp, catalog },
    { locale: L, now: NOW, ...options },
  );
}

describe("timeRemaining", () => {
  test.each([
    [5 * 86_400_000, { amount: 5, unit: "day" }],
    [3 * 3_600_000 + 10_000, { amount: 3, unit: "hour" }],
    [45 * 60_000, { amount: 45, unit: "minute" }],
    [30_000, { amount: 30, unit: "second" }],
  ])("buckets %i ms", (ms, expected) => {
    expect(timeRemaining(new Date(NOW.getTime() + ms), NOW)).toEqual(expected);
  });

  test("is null once the moment has passed", () => {
    expect(timeRemaining(NOW, NOW)).toBeNull();
    expect(timeRemaining(daysFromNow(-1), NOW)).toBeNull();
  });
});

describe("derivePlanSummary notice precedence", () => {
  test("a trial yields the trial notice with the countdown", () => {
    const summary = summarize(
      proCompanyContext({ subscription: trialSubscription(5) }),
    );
    expect(summary.notice).toMatchObject({
      kind: "trial",
      remaining: { amount: 5, unit: "day" },
      endsAtText: formatDate(daysFromNow(5), L),
    });
  });

  test("cancel beats trial when the subscription cancels at the period end", () => {
    const summary = summarize(
      proCompanyContext({
        subscription: subscription({
          ...trialSubscription(5),
          cancelAt: daysFromNow(5),
          cancelAtPeriodEnd: true,
        }),
      }),
    );
    expect(summary.notice).toMatchObject({
      kind: "cancel",
      planName: "Pro",
      atText: formatDate(daysFromNow(5), L),
    });
  });

  test("a cancel with cancelAtPeriodEnd off is not a cancel notice", () => {
    const summary = summarize(
      proCompanyContext({
        subscription: subscription({
          cancelAt: daysFromNow(5),
          cancelAtPeriodEnd: false,
        }),
      }),
    );
    expect(summary.notice).toBeNull();
    expect(summary.renewsAt).not.toBeNull();
  });

  test("trial beats pending custom billing, which beats a scheduled downgrade", () => {
    const billed = paymentActivatedCompany();
    const downgrade = scheduledDowngrade({
      plan: { id: "plan_free", name: "Free" },
    });
    expect(
      summarize({ ...billed, subscription: trialSubscription() }).notice,
    ).toMatchObject({ kind: "trial" });
    expect(
      summarize({ ...billed, scheduledDowngrade: downgrade }).notice,
    ).toMatchObject({ kind: "custom_billing" });
    expect(
      summarize(proCompanyContext({ scheduledDowngrade: downgrade })).notice,
    ).toMatchObject({
      kind: "scheduled_downgrade",
      toPlanName: "Free",
      fromPlanName: "Pro",
      atText: formatDate(daysFromNow(20), L),
    });
  });

  test("paid custom billing raises no notice", () => {
    const billed = paymentActivatedCompany();
    const paid = {
      ...billed,
      customBilling: { ...billed.customBilling!, status: "paid" },
    };
    expect(summarize(paid).notice).toBeNull();
    expect(summarize(paid).canChangePlan).toBe(true);
  });
});

describe("derivePlanSummary trial outcome", () => {
  const trialing = () =>
    proCompanyContext({ subscription: trialSubscription() });

  test("subscribe when a payment method is required", () => {
    const catalog = proCompanyCatalog({
      checkoutBehavior: checkoutBehavior({
        trialExpiryPlan: { id: "plan_free", name: "Free" },
        trialPaymentMethodRequired: true,
      }),
    });
    expect(summarize(trialing(), {}, catalog).notice).toMatchObject({
      kind: "trial",
      after: { kind: "subscribe" },
    });
  });

  test("downgrade to the trial expiry plan", () => {
    expect(summarize(trialing()).notice).toMatchObject({
      after: { kind: "downgrade", planName: "Free" },
    });
  });

  test("cancel with the plan name when nothing lands the company anywhere", () => {
    const catalog = proCompanyCatalog({
      checkoutBehavior: checkoutBehavior(),
    });
    expect(summarize(trialing(), {}, catalog).notice).toMatchObject({
      after: { kind: "cancel", planName: "Pro" },
    });
  });

  test("without a catalog the outcome falls back to cancel", () => {
    const summary = derivePlanSummary(
      { company: trialing(), catalog: undefined },
      { locale: L, now: NOW },
    );
    expect(summary.notice).toMatchObject({
      after: { kind: "cancel", planName: "Pro" },
    });
    expect(summary.usageBased).toEqual([]);
    expect(summary.credits).toEqual([]);
    expect(summary.canChangePlan).toBe(false);
  });

  test("a trial that already ended has no countdown", () => {
    const summary = summarize(
      proCompanyContext({ subscription: trialSubscription(-1) }),
    );
    expect(summary.notice).toMatchObject({ kind: "trial", remaining: null });
  });
});

describe("derivePlanSummary price", () => {
  test("priced monthly and yearly plans carry the short period", () => {
    expect(summarize(proCompanyContext()).plan?.price).toEqual({
      kind: "priced",
      text: "$49.00",
      periodShort: "mo",
    });
    const yearlyCompany = proCompanyContext({
      plan: heldPlan({
        id: "plan_pro",
        name: "Pro",
        price: withId(yearly(49000), "price_pro_y"),
      }),
      subscription: subscription({ interval: "year" }),
    });
    expect(summarize(yearlyCompany).plan?.price).toEqual({
      kind: "priced",
      text: "$490.00",
      periodShort: "yr",
    });
  });

  test("a free plan is $0.00 without a period, or Free when asked", () => {
    const free = company({
      plan: heldPlan({ id: "plan_free", name: "Free", price: null }),
    });
    expect(summarize(free).plan?.price).toEqual({
      kind: "priced",
      text: "$0.00",
      periodShort: null,
    });
    expect(summarize(free, { showZeroPriceAsFree: true }).plan?.price).toEqual({
      kind: "free",
    });
  });

  test("a $0 plan with priced entitlements is usage-based", () => {
    const usage = proCompanyContext({
      plan: heldPlan({ id: "plan_pro", name: "Pro", price: monthly(0) }),
    });
    const summary = summarize(usage);
    expect(summary.plan?.price).toEqual({ kind: "usage_based" });
    expect(summary.usageBased.map((e) => e.feature.name)).toEqual([
      "API call",
      "Seat",
      "Image generation",
    ]);
  });

  test("a custom plan is custom", () => {
    expect(summarize(paymentActivatedCompany()).plan?.price).toEqual({
      kind: "custom",
    });
  });

  test("no plan", () => {
    expect(summarize(company()).plan).toBeNull();
  });
});

describe("derivePlanSummary add-ons", () => {
  test("recurring, one-time, per-seat, and free add-ons", () => {
    const summary = summarize(
      proCompanyContext({
        addOns: [
          ...proCompanyContext().addOns,
          seatAddOn(),
          oneTimeAddOn(),
          freeAddOn(),
        ],
      }),
    );
    expect(summary.addOns).toEqual([
      {
        id: "addon_analytics",
        name: "Advanced analytics",
        priceText: "$19.00",
        periodShort: "mo",
        quantity: null,
        isOneTime: false,
      },
      {
        id: "addon_seats",
        name: "Extra seats",
        priceText: "$5.00",
        periodShort: "mo",
        quantity: 3,
        isOneTime: false,
      },
      {
        id: "addon_onboarding",
        name: "Onboarding session",
        priceText: "$500.00",
        periodShort: null,
        quantity: null,
        isOneTime: true,
      },
      {
        id: "addon_beta",
        name: "Beta features",
        priceText: null,
        periodShort: null,
        quantity: null,
        isOneTime: false,
      },
    ]);
  });
});

describe("derivePlanSummary credits and auto top-up", () => {
  test("included credits and the matching auto top-up line", () => {
    const summary = summarize(proCompanyContext());
    expect(summary.credits.map((c) => c.quantityText)).toEqual(["500"]);
    expect(summary.autoTopups).toEqual([
      expect.objectContaining({
        enabled: true,
        selfService: true,
        thresholdCredits: 50,
        thresholdText: "50",
        amount: 500,
        amountText: "500",
        unit: "AI credits",
      }),
    ]);
  });

  test("drops top-ups that are off or for credits the plan does not grant", () => {
    const summary = summarize(
      proCompanyContext({
        creditAutoTopups: [
          creditAutoTopup({ creditId: "credit_ai", availability: "off" }),
          creditAutoTopup({ creditId: "credit_other" }),
        ],
      }),
    );
    expect(summary.autoTopups).toEqual([]);
  });

  test("showCredits off hides both", () => {
    const summary = summarize(proCompanyContext(), { showCredits: false });
    expect(summary.credits).toEqual([]);
    expect(summary.autoTopups).toEqual([]);
  });
});

describe("derivePlanSummary canChangePlan", () => {
  test("follows the checkout capability", () => {
    expect(summarize(proCompanyContext()).canChangePlan).toBe(true);
    const noCheckout = proCompanyCatalog({ capabilities: { checkout: false } });
    expect(summarize(proCompanyContext(), {}, noCheckout).canChangePlan).toBe(
      false,
    );
  });

  test("is off while a payment-activated custom plan awaits payment", () => {
    const billed = paymentActivatedCompany();
    expect(summarize(billed).canChangePlan).toBe(false);
    const keptByPayment = {
      ...billed,
      customBilling: {
        ...billed.customBilling!,
        activationStrategy: "on_payment",
      },
    };
    const summary = summarize(keptByPayment);
    expect(summary.canChangePlan).toBe(true);
    expect(summary.notice).toMatchObject({
      kind: "custom_billing",
      awaitingActivation: false,
    });
  });
});

describe("derivePlanSummary custom billing", () => {
  test("dueAt is publishedAt plus daysUntilDue, with the invoice link", () => {
    const summary = summarize(paymentActivatedCompany());
    expect(summary.notice).toEqual({
      kind: "custom_billing",
      awaitingActivation: true,
      planName: "Enterprise",
      dueAt: daysFromNow(29),
      dueAtText: formatDate(daysFromNow(29), L),
      invoiceUrl: "https://invoice.example/pay",
    });
  });

  test("dueAt is null when the invoice is unpublished", () => {
    const billed = paymentActivatedCompany();
    const summary = summarize({
      ...billed,
      customBilling: { ...billed.customBilling!, publishedAt: null },
    });
    expect(summary.notice).toMatchObject({ dueAt: null, dueAtText: null });
  });
});

describe("derivePlanSummary renewal", () => {
  test("renews at the period end while subscribed", () => {
    expect(summarize(proCompanyContext()).renewsAt).toEqual({
      date: daysFromNow(20),
      text: formatDate(daysFromNow(20), L),
    });
    expect(summarize(proCompanyContext()).period).toBe("month");
  });

  test("null when canceling or unsubscribed", () => {
    expect(
      summarize(proCompanyContext({ subscription: cancelingSubscription() }))
        .renewsAt,
    ).toBeNull();
    expect(summarize(company()).renewsAt).toBeNull();
    expect(summarize(company()).period).toBeNull();
  });
});
