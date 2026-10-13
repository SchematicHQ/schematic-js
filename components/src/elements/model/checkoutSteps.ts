import type {
  Catalog,
  Checkout,
  CheckoutProblem,
  Company,
} from "@schematichq/schematic-react";

import {
  cartAddOns,
  cartPayInAdvance,
  cartPlan,
  offeredAddOns,
  offeredBundles,
  trialActive,
  type CheckoutCart,
} from "./checkoutCart";
import type {
  CheckoutStep,
  CheckoutSteps,
  SkippableStep,
} from "./checkoutConfig";
import { isPayInAdvance, planPrice } from "./checkoutPrices";

/**
 * Which steps a checkout has, and where the customer is among them. The API
 * has no notion of steps: they are this element's way of walking a cart, and
 * each is derived from the catalog and the cart as they stand. Payment is
 * always last, since it is where the cart is paid for; every other step
 * appears only when there is something to choose in it.
 */

export interface StepContext {
  catalog: Catalog;
  company?: Company;
  cart: CheckoutCart;
  /** The checkout as the server last priced it. */
  checkout?: Checkout;
  config?: CheckoutSteps;
}

export interface StepPlan {
  /** The steps this checkout has, in order. */
  available: CheckoutStep[];
  /** The steps listed for the customer: all of them, or the unskipped ones. */
  visible: CheckoutStep[];
  /** Available steps the walk passes over. */
  skipped: Set<CheckoutStep>;
}

const ORDER: readonly CheckoutStep[] = [
  "plan",
  "autoTopup",
  "usage",
  "addOns",
  "addOnUsage",
  "credits",
  "payment",
];

/** The steps the cart has something to choose in, then payment. */
export function availableSteps({
  cart,
  catalog,
  company,
}: StepContext): CheckoutStep[] {
  const plan = cartPlan(cart, catalog);
  const trial = trialActive(cart, plan);
  const steps = new Set<CheckoutStep>();

  if (catalog.plans.length > 0) {
    steps.add("plan");
  }
  if (plan?.autoTopups.some((t) => t.availability === "user_controlled")) {
    steps.add("autoTopup");
  }
  // A trial that needs no card starts with nothing more than the plan.
  const trialWithoutCard =
    trial && catalog.trialPaymentMethodRequired === false;
  if (!trialWithoutCard) {
    const lines = cartPayInAdvance(cart, catalog);
    if (lines.some((line) => line.owner.id === plan?.id)) {
      steps.add("usage");
    }
    if (offeredAddOns(cart, catalog).length > 0) {
      steps.add("addOns");
    }
    if (
      cartAddOns(cart, catalog).some((addOn) =>
        addOn.entitlements.some(isPayInAdvance),
      )
    ) {
      steps.add("addOnUsage");
    }
    if (offeredBundles(cart, catalog, company).length > 0) {
      steps.add("credits");
    }
  }
  steps.add("payment");
  return ORDER.filter((step) => steps.has(step));
}

/**
 * The step a problem is about, so a skipped step with a blocking problem is
 * shown again; `undefined` for one about the checkout as a whole.
 */
export function stepOfProblem(
  problem: CheckoutProblem,
  { cart, catalog }: Pick<StepContext, "cart" | "catalog">,
): CheckoutStep | undefined {
  const code = problem.code;
  if (
    code === "plan_unavailable" ||
    code === "plan_not_trialable" ||
    code === "price_unavailable" ||
    code === "downgrade_not_permitted" ||
    code === "usage_over_limit" ||
    code === "currency_mismatch" ||
    code === "subscription_currency_change"
  ) {
    return "plan";
  }
  if (
    code === "pay_in_advance_required" ||
    code === "pay_in_advance_price_invalid" ||
    code === "usage_price_missing_for_interval" ||
    code === "trial_excludes_usage_based"
  ) {
    const addOnLine = cartPayInAdvance(cart, catalog).find(
      (line) =>
        line.owner.id !== cart.planId &&
        (line.price?.id === problem.priceId ||
          line.entitlement.featureId === problem.featureId),
    );
    return addOnLine === undefined ? "usage" : "addOnUsage";
  }
  if (code.startsWith("add_on_") || code === "trial_excludes_add_ons") {
    return "addOns";
  }
  if (code.startsWith("credit_bundle")) {
    return "credits";
  }
  if (
    code === "payment_method_required" ||
    code === "opt_in_required" ||
    code === "custom_field_required" ||
    code === "invoice_email_required" ||
    code === "discount_ineligible" ||
    code === "provider_rejected"
  ) {
    return "payment";
  }
  return undefined;
}

/** Only a plan step has a requirement to meet: a plan the cart can be priced on. */
function requirementMet(step: SkippableStep, ctx: StepContext): boolean {
  if (step !== "plan") {
    return true;
  }
  const plan = cartPlan(ctx.cart, ctx.catalog);
  return (
    plan !== undefined &&
    planPrice(plan, ctx.cart.period, ctx.cart.currency) !== undefined
  );
}

/**
 * The steps, and which of them are passed over: the host's skips, except a
 * step whose requirement is not met, one a blocking problem points at, and
 * one the customer went back to (`revisited`).
 */
export function planSteps(
  ctx: StepContext,
  revisited: ReadonlySet<CheckoutStep> = new Set(),
): StepPlan {
  const available = availableSteps(ctx);
  const flagged = new Set(
    (ctx.checkout?.problems ?? [])
      .filter((p) => p.blocking)
      .map((p) => stepOfProblem(p, ctx))
      .filter((s): s is CheckoutStep => s !== undefined),
  );
  const skipped = new Set<CheckoutStep>(
    (ctx.config?.skip ?? []).filter(
      (step) =>
        available.includes(step) &&
        !revisited.has(step) &&
        !flagged.has(step) &&
        requirementMet(step, ctx),
    ),
  );
  const visible =
    ctx.config?.hideSkipped === true
      ? available.filter((step) => !skipped.has(step))
      : available;
  return { available, visible, skipped };
}

/** The first step at or after `from` that is not passed over. */
export function landOn(plan: StepPlan, from: CheckoutStep): CheckoutStep {
  const start = Math.max(0, plan.available.indexOf(from));
  for (const step of plan.available.slice(start)) {
    if (!plan.skipped.has(step)) {
      return step;
    }
  }
  return "payment";
}

/** Where a checkout opens: the host's initial step, else the first, past any skips. */
export function openingStep(
  plan: StepPlan,
  initial?: CheckoutStep,
): CheckoutStep {
  return landOn(
    plan,
    initial !== undefined && plan.available.includes(initial)
      ? initial
      : plan.available[0],
  );
}

/** The step after `current` that is not passed over; `undefined` after payment. */
export function stepAfter(
  plan: StepPlan,
  current: CheckoutStep,
): CheckoutStep | undefined {
  const index = plan.available.indexOf(current);
  for (const step of plan.available.slice(index + 1)) {
    if (!plan.skipped.has(step)) {
      return step;
    }
  }
  return undefined;
}

/** The step before `current` that is not passed over. */
export function stepBefore(
  plan: StepPlan,
  current: CheckoutStep,
): CheckoutStep | undefined {
  const index = plan.available.indexOf(current);
  for (const step of plan.available.slice(0, Math.max(0, index)).reverse()) {
    if (!plan.skipped.has(step)) {
      return step;
    }
  }
  return undefined;
}
