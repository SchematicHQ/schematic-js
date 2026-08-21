import {
  type CompanyContextResponseData,
  type CompanyPlanResponseData,
} from "../api/customer";

import { formatCurrency, formatDate, type FormatOptions } from "./format";
import { derivePeriod, type PricePeriod } from "./period";
import { derivePriceDisplay, type PriceDisplay } from "./prices";

/** A plan or add-on the company holds, with the price it actually pays. */
export interface PlanSummaryPlan {
  catalogId?: string;
  description?: string;
  formattedPrice?: string;
  icon?: string;
  id: string;
  isAddOn: boolean;
  /** Billed through custom-plan billing rather than a catalog price. */
  isCustom: boolean;
  name: string;
  period?: PricePeriod;
  price?: PriceDisplay;
  /** Seats, for per-seat plans with more than one. */
  quantity?: number;
}

/**
 * The notice the plan manager should surface, in precedence order:
 * trialing beats a scheduled cancellation beats a pending custom-plan
 * invoice beats a scheduled downgrade.
 */
export type PlanSummaryNotice =
  | {
      kind: "trialing";
      trialEndsAt?: Date;
      formattedTrialEndsAt?: string;
      /**
       * Where the company lands when the trial expires — catalog
       * configuration, read from the catalog view's trial_expiry_plan.
       */
      postTrialPlan?: { id: string; name: string };
    }
  | { kind: "will_cancel"; cancelsAt: Date; formattedCancelsAt: string }
  | {
      kind: "custom_plan_pending";
      daysUntilDue: number;
      invoiceUrl?: string;
      planId: string;
    }
  | {
      kind: "scheduled_downgrade";
      effectiveAt: Date;
      formattedEffectiveAt: string;
      formattedPrice?: string;
      toPlanId: string;
      toPlanName: string;
    };

export interface PlanSummary {
  addOns: PlanSummaryPlan[];
  currentPlan?: PlanSummaryPlan;
  notice?: PlanSummaryNotice;
  paymentMethod?: {
    brand?: string;
    expiryMonth?: number;
    expiryYear?: number;
    last4?: string;
    type: string;
  };
  subscription?: {
    cancelAtPeriodEnd: boolean;
    currency: string;
    currentPeriodEnd: Date;
    formattedCurrentPeriodEnd: string;
    formattedTotalPrice: string;
    interval: string;
    intervalCount: number;
    period?: PricePeriod;
    status: string;
    totalPrice: number;
    trialing: boolean;
  };
}

export interface PlanSummaryInput {
  /**
   * The company catalog view, when the consumer has one; supplies the
   * post-trial plan for the trialing notice.
   */
  catalog?: { trialExpiryPlan?: { id: string; name: string } };
  company: CompanyContextResponseData;
}

const buildPlan = (
  plan: CompanyPlanResponseData,
  options: FormatOptions,
): PlanSummaryPlan => {
  const vm: PlanSummaryPlan = {
    id: plan.id,
    isAddOn: plan.isAddOn,
    isCustom: plan.isCustom,
    name: plan.name,
  };
  if (plan.catalogId != null) {
    vm.catalogId = plan.catalogId;
  }
  if (plan.description !== "") {
    vm.description = plan.description;
  }
  if (plan.icon !== "") {
    vm.icon = plan.icon;
  }
  if (plan.price !== undefined) {
    vm.price = derivePriceDisplay(plan.price, options);
    vm.formattedPrice = vm.price.formatted;
    vm.period = vm.price.period;
  }
  if (plan.quantity != null) {
    vm.quantity = plan.quantity;
  }
  return vm;
};

/**
 * Derives the plan summary from the company context: the current plan and
 * add-ons with the prices the company pays, subscription facts, and the
 * single highest-precedence notice. Every timestamp arrives RFC3339 from
 * the server; nothing is converted here.
 */
export const derivePlanSummary = (
  input: PlanSummaryInput,
  options: FormatOptions = {},
): PlanSummary => {
  const { company, catalog } = input;
  const subscription = company.subscription;

  const vm: PlanSummary = {
    addOns: company.addOns.map((addOn) => buildPlan(addOn, options)),
  };
  if (company.plan !== undefined) {
    vm.currentPlan = buildPlan(company.plan, options);
  }

  if (subscription !== undefined) {
    const period = derivePeriod(
      subscription.interval,
      subscription.intervalCount,
    );
    vm.subscription = {
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      currency: subscription.currency,
      currentPeriodEnd: subscription.currentPeriodEnd,
      formattedCurrentPeriodEnd: formatDate(
        subscription.currentPeriodEnd,
        options,
      ),
      formattedTotalPrice: formatCurrency(
        subscription.totalPrice,
        subscription.currency,
        options,
      ),
      interval: subscription.interval,
      intervalCount: subscription.intervalCount,
      ...(period !== undefined ? { period } : {}),
      status: subscription.status,
      totalPrice: subscription.totalPrice,
      trialing: subscription.trialing,
    };
    const pm = subscription.paymentMethod;
    if (pm !== undefined) {
      vm.paymentMethod = {
        ...(pm.brand != null ? { brand: pm.brand } : {}),
        ...(pm.expiryMonth != null ? { expiryMonth: pm.expiryMonth } : {}),
        ...(pm.expiryYear != null ? { expiryYear: pm.expiryYear } : {}),
        ...(pm.last4 != null ? { last4: pm.last4 } : {}),
        type: pm.type,
      };
    }
  }

  // Notice precedence mirrors the legacy plan manager.
  if (subscription?.trialing === true) {
    const notice: PlanSummaryNotice = { kind: "trialing" };
    if (subscription.trialEnd != null) {
      notice.trialEndsAt = subscription.trialEnd;
      notice.formattedTrialEndsAt = formatDate(subscription.trialEnd, options);
    }
    if (catalog?.trialExpiryPlan !== undefined) {
      notice.postTrialPlan = {
        id: catalog.trialExpiryPlan.id,
        name: catalog.trialExpiryPlan.name,
      };
    }
    vm.notice = notice;
    return vm;
  }

  if (
    subscription?.cancelAtPeriodEnd === true &&
    subscription.cancelAt != null
  ) {
    vm.notice = {
      kind: "will_cancel",
      cancelsAt: subscription.cancelAt,
      formattedCancelsAt: formatDate(subscription.cancelAt, options),
    };
    return vm;
  }

  const customBilling = company.customBilling;
  if (customBilling !== undefined && customBilling.status === "pending") {
    vm.notice = {
      kind: "custom_plan_pending",
      daysUntilDue: customBilling.daysUntilDue,
      ...(customBilling.invoiceUrl != null
        ? { invoiceUrl: customBilling.invoiceUrl }
        : {}),
      planId: customBilling.planId,
    };
    return vm;
  }

  const downgrade = company.scheduledDowngrade;
  if (downgrade !== undefined) {
    vm.notice = {
      kind: "scheduled_downgrade",
      effectiveAt: downgrade.effectiveAt,
      formattedEffectiveAt: formatDate(downgrade.effectiveAt, options),
      ...(downgrade.price != null
        ? {
            formattedPrice: formatCurrency(
              downgrade.price,
              downgrade.currency,
              options,
            ),
          }
        : {}),
      toPlanId: downgrade.plan.id,
      toPlanName: downgrade.plan.name,
    };
  }

  return vm;
};
