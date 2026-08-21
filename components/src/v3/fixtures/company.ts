/**
 * Company-context fixtures for PlanManager and `derivePlanSummary`: the Pro
 * company from the scenarios plus the add-on, subscription, and billing
 * variations the derivation branches on.
 */

import type {
  CompanyContext,
  CompanyPlan,
  Subscription,
} from "@schematichq/schematic-react";

import {
  customBilling,
  daysFromNow,
  heldPlan,
  monthly,
  oneTime,
  subscription,
  withId,
} from "./builders";
import { SCENARIOS } from "./scenarios";

/** The healthy Pro company, with overrides. */
export function proCompanyContext(
  overrides: Partial<CompanyContext> = {},
): CompanyContext {
  const base = SCENARIOS.pro().company;
  if (base === undefined) {
    throw new Error("The pro scenario has no company");
  }
  return { ...base, ...overrides };
}

/** A per-seat add-on held at three seats. */
export const seatAddOn = (): CompanyPlan =>
  heldPlan({
    id: "addon_seats",
    name: "Extra seats",
    isAddOn: true,
    price: withId(monthly(500), "price_seats_m"),
    quantity: 3,
  });

/** A purchased one-time add-on. */
export const oneTimeAddOn = (): CompanyPlan =>
  heldPlan({
    id: "addon_onboarding",
    name: "Onboarding session",
    isAddOn: true,
    price: withId(oneTime(50000), "price_onboarding"),
  });

/** A held add-on with no price. */
export const freeAddOn = (): CompanyPlan =>
  heldPlan({
    id: "addon_beta",
    name: "Beta features",
    isAddOn: true,
    price: null,
  });

/** A trial ending in `days` days. */
export const trialSubscription = (days = 5): Subscription =>
  subscription({
    id: "sub_trial",
    status: "trialing",
    trialing: true,
    trialEnd: daysFromNow(days),
  });

/** A subscription ending at the period end in `days` days. */
export const cancelingSubscription = (days = 20): Subscription =>
  subscription({
    id: "sub_cancel",
    cancelAt: daysFromNow(days),
    cancelAtPeriodEnd: true,
  });

/** A custom-billed Enterprise company whose plan activates on payment. */
export function paymentActivatedCompany(): CompanyContext {
  return proCompanyContext({
    plan: heldPlan({
      id: "plan_enterprise",
      name: "Enterprise",
      isCustom: true,
      price: null,
    }),
    addOns: [],
    subscription: null,
    customBilling: customBilling({
      planId: "plan_enterprise",
      activationStrategy: "payment",
    }),
  });
}
