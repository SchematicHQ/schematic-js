import {
  autoTopup,
  catalog,
  catalogAddOn,
  catalogPlan,
  checkoutDraft,
  creditBundle,
  payInAdvanceEntitlement,
  problem,
} from "../fixtures/checkout";

import { initialCart, type CheckoutCart } from "./checkoutCart";
import type { CheckoutSteps } from "./checkoutConfig";
import {
  availableSteps,
  openingStep,
  planSteps,
  stepAfter,
  stepBefore,
  stepOfProblem,
  type StepContext,
} from "./checkoutSteps";

const seats = payInAdvanceEntitlement();
const addOnSeats = payInAdvanceEntitlement();
const plan = catalogPlan({
  autoTopups: [autoTopup()],
  entitlements: [seats],
});
const addOn = catalogAddOn({ entitlements: [addOnSeats] });
const bundle = creditBundle();
const full = catalog({
  addOns: [addOn],
  creditBundles: [bundle],
  plans: [plan],
});

const context = (
  overrides: Partial<CheckoutCart> = {},
  extra: Partial<StepContext> = {},
): StepContext => ({
  catalog: full,
  cart: {
    ...initialCart({
      catalog: full,
      config: { selection: { planId: plan.id } },
    }),
    ...overrides,
  },
  ...extra,
});

describe("availableSteps", () => {
  test("lists every step with something to choose in it, payment last", () => {
    expect(availableSteps(context({ addOnIds: [addOn.id] }))).toEqual([
      "plan",
      "autoTopup",
      "usage",
      "addOns",
      "addOnUsage",
      "credits",
      "payment",
    ]);
  });

  test("leaves out add-on usage until an add-on with it is chosen", () => {
    expect(availableSteps(context())).not.toContain("addOnUsage");
  });

  test("a credit-only purchase has the bundles and payment", () => {
    const creditsOnly = catalog({ creditBundles: [bundle] });
    expect(
      availableSteps({
        catalog: creditsOnly,
        cart: initialCart({ catalog: creditsOnly }),
      }),
    ).toEqual(["credits", "payment"]);
  });

  test("a trial that needs no card goes from the plan to payment", () => {
    const trialable = catalogPlan({
      companyCanTrial: true,
      entitlements: [seats],
      isTrialable: true,
    });
    const noCard = catalog({
      addOns: [addOn],
      creditBundles: [bundle],
      plans: [trialable],
      trialPaymentMethodRequired: false,
    });
    expect(
      availableSteps({
        catalog: noCard,
        cart: initialCart({
          catalog: noCard,
          config: { selection: { planId: trialable.id } },
        }),
      }),
    ).toEqual(["plan", "payment"]);
  });

  test("a trial that needs a card keeps the usage but not the add-ons", () => {
    const trialable = catalogPlan({
      companyCanTrial: true,
      entitlements: [seats],
      isTrialable: true,
    });
    const card = catalog({ addOns: [addOn], plans: [trialable] });
    expect(
      availableSteps({
        catalog: card,
        cart: initialCart({
          catalog: card,
          config: { selection: { planId: trialable.id } },
        }),
      }),
    ).toEqual(["plan", "usage", "payment"]);
  });
});

describe("planSteps", () => {
  const skipAll: CheckoutSteps = {
    skip: ["plan", "autoTopup", "usage", "addOns", "credits"],
  };

  test("passes over the host's skips and opens past them", () => {
    const steps = planSteps({ ...context(), config: skipAll });
    expect([...steps.skipped]).toEqual([
      "plan",
      "autoTopup",
      "usage",
      "addOns",
      "credits",
    ]);
    expect(steps.visible).toEqual(steps.available);
    expect(openingStep(steps)).toBe("payment");
  });

  test("hides skipped steps only when asked", () => {
    const steps = planSteps({
      ...context(),
      config: { ...skipAll, hideSkipped: true },
    });
    expect(steps.visible).toEqual(["payment"]);
  });

  test("shows a skipped plan step when no plan resolves", () => {
    const steps = planSteps({
      ...context({ planId: undefined }),
      config: { skip: ["plan"] },
    });
    expect(steps.skipped.has("plan")).toBe(false);
    expect(openingStep(steps)).toBe("plan");
  });

  test("shows a skipped step again when a blocking problem points at it", () => {
    const checkout = checkoutDraft({
      problems: [
        problem({
          code: "pay_in_advance_required",
          featureId: seats.featureId,
        }),
        problem({ blocking: false, code: "add_on_unavailable" }),
      ],
    });
    const steps = planSteps({ ...context({}, { checkout }), config: skipAll });
    expect(steps.skipped.has("usage")).toBe(false);
    expect(steps.skipped.has("addOns")).toBe(true);
    expect(openingStep(steps)).toBe("usage");
  });

  test("shows a skipped step the customer went back to", () => {
    const steps = planSteps(
      { ...context(), config: skipAll },
      new Set(["plan"] as const),
    );
    expect(openingStep(steps)).toBe("plan");
  });

  test("walks forward and back past skipped steps", () => {
    const steps = planSteps({
      ...context(),
      config: { skip: ["autoTopup", "usage"] },
    });
    expect(stepAfter(steps, "plan")).toBe("addOns");
    expect(stepBefore(steps, "addOns")).toBe("plan");
    expect(stepAfter(steps, "payment")).toBeUndefined();
  });

  test("an initial step the checkout does not have falls back to the first", () => {
    const steps = planSteps(context());
    expect(openingStep(steps, "addOnUsage")).toBe("plan");
    expect(openingStep(steps, "credits")).toBe("credits");
  });
});

describe("stepOfProblem", () => {
  test.each([
    ["plan_unavailable", "plan"],
    ["currency_mismatch", "plan"],
    ["usage_over_limit", "plan"],
    ["add_on_conflicts_with_plan", "addOns"],
    ["trial_excludes_add_ons", "addOns"],
    ["credit_bundle_incompatible", "credits"],
    ["payment_method_required", "payment"],
    ["custom_field_required", "payment"],
    ["opt_in_required", "payment"],
    ["checkout_superseded", undefined],
  ] as const)("%s → %s", (code, step) => {
    expect(stepOfProblem(problem({ code }), context())).toBe(step);
  });

  test("puts a pay-in-advance problem on the step whose price it names", () => {
    const ctx = context({ addOnIds: [addOn.id] });
    expect(
      stepOfProblem(
        problem({
          code: "pay_in_advance_required",
          priceId: addOnSeats.meteredMonthlyPrice?.id,
        }),
        ctx,
      ),
    ).toBe("addOnUsage");
    expect(
      stepOfProblem(
        problem({
          code: "pay_in_advance_required",
          priceId: seats.meteredMonthlyPrice?.id,
        }),
        ctx,
      ),
    ).toBe("usage");
  });
});
