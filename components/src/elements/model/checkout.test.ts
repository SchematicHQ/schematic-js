import { daysFromNow } from "../fixtures/builders";
import {
  autoTopup,
  catalog,
  catalogAddOn,
  catalogPlan,
  checkoutDraft,
  checkoutField,
  company,
  companyOn,
  creditBundle,
  monthly,
  payInAdvanceEntitlement,
  priceSnapshot,
  problem,
  prorationDetail,
  prorationLine,
  subscription,
  yearly,
  type ProrationDetail,
} from "../fixtures/checkout";

import { deriveCheckout, normalizePeriod } from "./checkout";
import { initialCart, type CheckoutCart } from "./checkoutCart";

const seats = payInAdvanceEntitlement();
const pro = catalogPlan({ entitlements: [seats], name: "Pro" });
const addOn = catalogAddOn({ name: "Support" });
const bundle = creditBundle();
const cat = catalog({ addOns: [addOn], creditBundles: [bundle], plans: [pro] });

const cartOn = (overrides: Partial<CheckoutCart> = {}): CheckoutCart => ({
  ...initialCart({ catalog: cat, config: { selection: { planId: pro.id } } }),
  ...overrides,
});

describe("deriveCheckout", () => {
  test("lists the plans priced in the cart's period, the chosen one selected", () => {
    const model = deriveCheckout({
      catalog: cat,
      cart: cartOn(),
      locale: "en-US",
    });
    expect(model.plans).toEqual([
      expect.objectContaining({
        id: pro.id,
        priceText: "$25.00",
        recurring: true,
        selected: true,
        valid: true,
      }),
    ]);
    expect(model.period).toEqual({
      value: "month",
      options: ["month", "year"],
      selectable: true,
    });
  });

  test("lines up what the cart holds at catalog prices, and leaves the totals to the server", () => {
    const cart = cartOn({
      addOnIds: [addOn.id],
      bundles: { [bundle.id]: 2 },
      quantities: { [seats.featureId]: 3 },
    });
    const model = deriveCheckout({ catalog: cat, cart, locale: "en-US" });
    expect(model.lines.map((l) => [l.label, l.quantity, l.amountText])).toEqual(
      [
        ["Pro", null, "$25.00"],
        ["Support", null, "$5.00"],
        ["Seats", 3, "$15.00"],
        ["100 credits", 2, "$20.00"],
      ],
    );
    expect(model.totals).toBeNull();

    const priced = deriveCheckout({
      catalog: cat,
      cart,
      checkout: checkoutDraft({
        priceSnapshot: priceSnapshot({
          discountAmount: 500,
          dueNow: 5500,
          promoCodeApplied: true,
          proration: -1200,
          totalPerBillingPeriod: 4500,
        }),
      }),
      locale: "en-US",
    });
    expect(priced.totals).toMatchObject({
      discountText: "-$5.00",
      dueNowText: "$55.00",
      promoCodeApplied: true,
      proration: null,
      prorationText: "-$12.00",
      totalPerPeriodText: "$45.00",
    });
  });

  test("falls back to the longest period the plan sells", () => {
    const yearlyOnly = catalogPlan({ monthlyPrice: undefined });
    const only = catalog({ plans: [yearlyOnly] });
    const cart = initialCart({
      catalog: only,
      config: { selection: { planId: yearlyOnly.id, period: "month" } },
    });
    expect(normalizePeriod(cart, only)).toBe("year");
    expect(
      deriveCheckout({ catalog: only, cart, locale: "en-US" }).period.value,
    ).toBe("year");
  });

  test("locks the currency to the subscription's, and offers a choice only without one", () => {
    const multi = catalog({
      plans: [
        catalogPlan({
          currencyPrices: [
            { currency: "eur", monthlyPrice: monthly(2300, "eur") },
          ],
        }),
      ],
    });
    const open = deriveCheckout({
      catalog: multi,
      cart: initialCart({ catalog: multi }),
      locale: "en-US",
    });
    expect(open.currency).toMatchObject({ locked: false, selectable: true });

    const eurCompany = company({
      subscription: subscription({ currency: "eur" }),
    });
    const locked = deriveCheckout({
      catalog: multi,
      cart: initialCart({ catalog: multi, company: eurCompany }),
      company: eurCompany,
      locale: "en-US",
    });
    expect(locked.currency).toMatchObject({
      locked: true,
      options: ["eur"],
      selectable: false,
      value: "eur",
    });

    const hidden = deriveCheckout({
      catalog: multi,
      cart: initialCart({ catalog: multi }),
      display: { showCurrencySelector: false },
      locale: "en-US",
    });
    expect(hidden.currency.selectable).toBe(false);
  });

  test("offers no add-ons during a trial, and reports the trial", () => {
    const trialable = catalogPlan({
      companyCanTrial: true,
      isTrialable: true,
      trialDays: 14,
    });
    const trialCatalog = catalog({ addOns: [addOn], plans: [trialable] });
    const model = deriveCheckout({
      catalog: trialCatalog,
      cart: initialCart({
        catalog: trialCatalog,
        config: { selection: { planId: trialable.id } },
      }),
      checkout: checkoutDraft({
        priceSnapshot: priceSnapshot({ trialEnd: daysFromNow(14) }),
      }),
      locale: "en-US",
    });
    expect(model.addOns).toEqual([]);
    expect(model.trial).toBe(true);
    expect(model.plans[0].trialDays).toBe(14);
    expect(model.totals?.trialEndText).toMatch(/2026/);
  });

  test("groups problems by the step they are about, and blocks a finalize on any blocking one", () => {
    const model = deriveCheckout({
      catalog: cat,
      cart: cartOn(),
      checkout: checkoutDraft({
        problems: [
          problem({ code: "payment_method_required" }),
          problem({ blocking: false, code: "checkout_superseded" }),
        ],
      }),
      locale: "en-US",
    });
    expect(model.problems.byStep.payment).toHaveLength(1);
    expect(model.problems.global).toHaveLength(1);
    expect(model.problems.blocking).toBe(true);
    expect(model.canFinalize).toBe(false);

    const clean = deriveCheckout({
      catalog: cat,
      cart: cartOn(),
      checkout: checkoutDraft(),
      locale: "en-US",
    });
    expect(clean.canFinalize).toBe(true);
    expect(
      deriveCheckout({
        catalog: cat,
        cart: cartOn(),
        checkout: checkoutDraft(),
        isPricing: true,
        locale: "en-US",
      }).canFinalize,
    ).toBe(false);
  });

  test("carries the payment step's requirements from the catalog and the price", () => {
    const field = checkoutField({ required: true });
    const withFields = catalog({
      plans: [pro],
      checkoutSettings: {
        ...cat.checkoutSettings,
        collectTaxId: true,
        customFields: [field],
      },
    });
    const model = deriveCheckout({
      catalog: withFields,
      cart: {
        ...initialCart({
          catalog: withFields,
          config: { selection: { planId: pro.id } },
        }),
        customFields: { [field.id]: "PO-9" },
      },
      checkout: checkoutDraft({
        priceSnapshot: priceSnapshot({
          optInRequired: true,
          optInText: "I agree.",
          optInTitle: "Terms",
        }),
      }),
      locale: "en-US",
    });
    expect(model.requirements).toEqual({
      collectTaxId: true,
      customFields: [
        {
          helperText: null,
          id: field.id,
          name: "PO Number",
          required: true,
          value: "PO-9",
        },
      ],
      optIn: { required: true, text: "I agree.", title: "Terms" },
      paymentMethodRequired: true,
    });
  });

  test("shows the company's top-up choices over the plan's defaults", () => {
    const topup = autoTopup({ companyAmount: 800, companyEnabled: false });
    const withTopups = catalog({
      plans: [catalogPlan({ autoTopups: [topup] })],
    });
    const planId = withTopups.plans[0].id;
    const model = deriveCheckout({
      catalog: withTopups,
      cart: initialCart({
        catalog: withTopups,
        config: { selection: { planId } },
      }),
      locale: "en-US",
    });
    expect(model.autoTopups).toEqual([
      expect.objectContaining({
        amount: 800,
        costText: "$16.00",
        enabled: false,
        thresholdCredits: 100,
      }),
    ]);
  });

  test("offers only the bundles sold with the plan in the cart's currency", () => {
    const restricted = creditBundle({ compatiblePlanIds: ["plan_other"] });
    const euro = creditBundle({ price: yearly(1, "eur") });
    const model = deriveCheckout({
      catalog: catalog({
        creditBundles: [bundle, restricted, euro],
        plans: [pro],
      }),
      cart: cartOn(),
      locale: "en-US",
    });
    expect(model.bundles.map((b) => b.id)).toEqual([bundle.id]);
    expect(model.bundles[0]).toMatchObject({
      credits: 100,
      creditName: "Credits",
    });
  });
});

describe("deriveCheckout proration", () => {
  const starter = catalogPlan({ current: true, name: "Starter" });
  const two = catalog({ plans: [starter, pro] });
  const totalsWith = (detail: ProrationDetail | undefined, onPlan = starter) =>
    deriveCheckout({
      catalog: two,
      cart: cartOn(),
      checkout: checkoutDraft({
        priceSnapshot: priceSnapshot({
          proration: detail?.total ?? -1200,
          prorationDetail: detail,
        }),
      }),
      company: companyOn(onPlan),
      locale: "en-US",
    }).totals;

  test("itemizes the lines by the cart's plans, with their period", () => {
    const block = totalsWith(
      prorationDetail({
        lines: [
          prorationLine({ planId: starter.id }),
          prorationLine({ amount: 2500, kind: "charge", planId: pro.id }),
        ],
      }),
    )?.proration;
    expect(block).toMatchObject({
      billedAtText: null,
      chargeText: "$25.00",
      creditText: "-$12.50",
      timing: "now",
      totalText: "$12.50",
    });
    expect(block?.lines.map((l) => [l.kind, l.name, l.amountText])).toEqual([
      ["credit", "Starter", "-$12.50"],
      ["charge", "Pro", "$25.00"],
    ]);
    expect(block?.lines[0].periodText).toMatch(
      /^8\/2[01]\s?[\u2013-]\s?9\/(19|20)$/u,
    );
  });

  test("leaves a line unnamed and undated when the server names no plan or period", () => {
    const block = totalsWith(
      prorationDetail({
        lines: [
          prorationLine({
            periodEnd: undefined,
            periodStart: undefined,
            planId: "plan_gone",
          }),
        ],
      }),
    )?.proration;
    expect(block?.lines[0]).toMatchObject({ name: null, periodText: null });
  });

  test("names the company's plan when the catalog no longer sells it", () => {
    const legacy = catalogPlan({ id: "plan_legacy", name: "Legacy" });
    const block = totalsWith(
      prorationDetail({ lines: [prorationLine({ planId: legacy.id })] }),
      legacy,
    )?.proration;
    expect(block?.lines[0].name).toBe("Legacy");
  });

  test("says when a proration held for the renewal is billed", () => {
    const block = totalsWith(
      prorationDetail({ billedAt: daysFromNow(30), timing: "at_renewal" }),
    )?.proration;
    expect(block?.timing).toBe("at_renewal");
    expect(block?.billedAtText).toMatch(/^September (19|20|21), 2026$/);
  });

  test("dates nothing for a proration that lands nowhere", () => {
    const block = totalsWith(
      prorationDetail({ billedAt: undefined, timing: "none" }),
    )?.proration;
    expect(block).toMatchObject({ billedAtText: null, timing: "none" });
  });

  test("falls back to the single figure when the server itemizes nothing", () => {
    const totals = totalsWith(prorationDetail({ lines: [], total: -1200 }));
    expect(totals?.proration).toBeNull();
    expect(totals?.prorationText).toBe("-$12.00");
  });
});
