import type {
  AnyCatalog,
  CompanyContext,
  CompanyPlan,
  CreditAutoTopup,
  CreditRef,
} from "../contract";
import { isCompanyCatalog } from "../contract";

import { deriveEntitlement, type EntitlementSummary } from "./entitlement";
import { featureName, formatCurrency, formatDate } from "./format";
import { derivePlanCredits, type PlanCreditSummary } from "./offerings";
import { PERIOD_SHORT, derivePeriod, type PricePeriod } from "./period";
import { priceAmount, pricePeriod } from "./prices";

/**
 * `derivePlanSummary`: the company's current plan as PlanManager shows it —
 * price line, held add-ons, the one notice that applies, included credits,
 * and whether the plan can be changed.
 */

export interface SummaryOptions {
  locale: string;
  /** Render a $0 plan as "Free". Default false. */
  showZeroPriceAsFree?: boolean;
  /** Show included credits. Default true. */
  showCredits?: boolean;
  /** "Now", for trial countdowns. Default: the wall clock. */
  now?: Date;
}

export type SummaryPrice =
  | { kind: "free" }
  | { kind: "usage_based" }
  | { kind: "custom" }
  | { kind: "priced"; text: string; periodShort: string | null };

export interface AddOnLine {
  id: string;
  name: string;
  /** "$5.00" — or null for a free add-on. */
  priceText: string | null;
  /** "mo" for recurring, null for one-time. */
  periodShort: string | null;
  /** Seats held, for per-seat add-ons. */
  quantity: number | null;
  isOneTime: boolean;
}

export interface TimeRemaining {
  amount: number;
  unit: "day" | "hour" | "minute" | "second";
}

export type Notice =
  | {
      kind: "trial";
      endsAt: Date;
      endsAtText: string;
      remaining: TimeRemaining | null;
      /** What happens after the trial. */
      after:
        | { kind: "subscribe" }
        | { kind: "downgrade"; planName: string }
        | { kind: "cancel"; planName: string }
        | null;
    }
  | { kind: "cancel"; planName: string | null; at: Date; atText: string }
  | {
      kind: "custom_billing";
      /** The plan activates on payment (true) or is kept by payment (false). */
      awaitingActivation: boolean;
      planName: string | null;
      dueAt: Date | null;
      dueAtText: string | null;
      invoiceUrl: string | null;
    }
  | {
      kind: "scheduled_downgrade";
      toPlanName: string;
      fromPlanName: string | null;
      at: Date;
      atText: string;
    };

export interface AutoTopupLine {
  credit: CreditRef;
  enabled: boolean;
  /** Whether the company may edit the setting. */
  selfService: boolean;
  thresholdCredits: number | null;
  amount: number | null;
  /** Credit unit name for `amount`. */
  unit: string;
}

export interface PlanSummary {
  plan: {
    id: string;
    name: string;
    description: string;
    icon: string | null;
    price: SummaryPrice;
  } | null;
  addOns: AddOnLine[];
  /** Priced entitlements on the current plan ("Usage-based" section). */
  usageBased: EntitlementSummary[];
  credits: PlanCreditSummary[];
  autoTopups: AutoTopupLine[];
  notice: Notice | null;
  /** The subscription's period, when any. */
  period: PricePeriod | null;
  /** Whether a plan-change CTA may render. */
  canChangePlan: boolean;
  /** Next renewal, when subscribed and not canceling. */
  renewsAt: { date: Date; text: string } | null;
}

export function timeRemaining(until: Date, now: Date): TimeRemaining | null {
  const ms = until.getTime() - now.getTime();
  if (ms <= 0) {
    return null;
  }
  const seconds = Math.floor(ms / 1000);
  if (seconds >= 86_400) {
    return { amount: Math.floor(seconds / 86_400), unit: "day" };
  }
  if (seconds >= 3_600) {
    return { amount: Math.floor(seconds / 3_600), unit: "hour" };
  }
  if (seconds >= 60) {
    return { amount: Math.floor(seconds / 60), unit: "minute" };
  }
  return { amount: seconds, unit: "second" };
}

function addOnLine(addOn: CompanyPlan, locale: string): AddOnLine {
  const period = addOn.price === null ? null : pricePeriod(addOn.price);
  const isOneTime = period === "one_time";
  return {
    id: addOn.id,
    name: addOn.name,
    priceText:
      addOn.price === null
        ? null
        : formatCurrency(
            priceAmount(addOn.price),
            addOn.price.currency,
            locale,
          ),
    periodShort: period === null || isOneTime ? null : PERIOD_SHORT[period],
    quantity: addOn.quantity,
    isOneTime,
  };
}

function autoTopupLines(
  topups: CreditAutoTopup[],
  credits: Map<string, CreditRef>,
): AutoTopupLine[] {
  return topups.flatMap((topup) => {
    const credit = credits.get(topup.creditId);
    if (credit === undefined || topup.availability === "off") {
      return [];
    }
    return [
      {
        credit,
        enabled: topup.enabled,
        selfService: topup.selfService,
        thresholdCredits: topup.thresholdCredits,
        amount: topup.amount,
        unit: featureName(credit, topup.amount ?? 0),
      },
    ];
  });
}

export function derivePlanSummary(
  data: { company: CompanyContext; catalog: AnyCatalog | undefined },
  options: SummaryOptions,
): PlanSummary {
  const { company, catalog } = data;
  const { locale, showCredits = true, showZeroPriceAsFree = false } = options;
  const now = options.now ?? new Date();
  const subscription = company.subscription;
  const period =
    subscription === null
      ? null
      : derivePeriod(subscription.interval, subscription.intervalCount);
  const catalogPlan =
    catalog === undefined || company.plan === null
      ? undefined
      : catalog.plans.find((p) => p.id === company.plan?.id);
  const currency = subscription?.currency ?? catalog?.defaultCurrency ?? "usd";

  const usageBased =
    catalogPlan === undefined || period === null
      ? []
      : catalogPlan.entitlements
          .filter((e) => e.priceBehavior !== null)
          .map((e) =>
            deriveEntitlement(e, { currency, locale, period, showCredits }),
          );

  let price: SummaryPrice = { kind: "free" };
  if (company.plan !== null) {
    const amount =
      company.plan.price === null ? 0 : priceAmount(company.plan.price);
    if (company.plan.isCustom) {
      price = { kind: "custom" };
    } else if (amount === 0 && usageBased.length > 0) {
      price = { kind: "usage_based" };
    } else if (amount === 0 && showZeroPriceAsFree) {
      price = { kind: "free" };
    } else {
      const planPeriod =
        company.plan.price === null ? period : pricePeriod(company.plan.price);
      price = {
        kind: "priced",
        text: formatCurrency(
          amount,
          company.plan.price?.currency ?? currency,
          locale,
        ),
        periodShort:
          amount === 0 || planPeriod === null ? null : PERIOD_SHORT[planPeriod],
      };
    }
  }

  const willCancel =
    subscription !== null &&
    subscription.cancelAt !== null &&
    subscription.cancelAtPeriodEnd;

  let notice: Notice | null = null;
  const trialEnd = subscription?.trialEnd ?? null;
  if (
    subscription !== null &&
    subscription.trialing &&
    !willCancel &&
    trialEnd !== null
  ) {
    const trialExpiryPlan =
      catalog !== undefined && isCompanyCatalog(catalog)
        ? catalog.checkoutBehavior.trialExpiryPlan
        : null;
    const paymentMethodRequired =
      catalog !== undefined &&
      isCompanyCatalog(catalog) &&
      catalog.checkoutBehavior.trialPaymentMethodRequired === true;
    notice = {
      kind: "trial",
      endsAt: trialEnd,
      endsAtText: formatDate(trialEnd, locale),
      remaining: timeRemaining(trialEnd, now),
      after: paymentMethodRequired
        ? { kind: "subscribe" }
        : trialExpiryPlan !== null
          ? { kind: "downgrade", planName: trialExpiryPlan.name }
          : company.plan !== null
            ? { kind: "cancel", planName: company.plan.name }
            : null,
    };
  } else if (willCancel && subscription.cancelAt !== null) {
    notice = {
      kind: "cancel",
      planName: company.plan?.name ?? null,
      at: subscription.cancelAt,
      atText: formatDate(subscription.cancelAt, locale),
    };
  } else if (
    company.customBilling !== null &&
    company.customBilling.status === "pending"
  ) {
    const billing = company.customBilling;
    const anchor = billing.publishedAt ?? null;
    const dueAt =
      anchor === null
        ? null
        : new Date(anchor.getTime() + billing.daysUntilDue * 86_400_000);
    notice = {
      kind: "custom_billing",
      awaitingActivation: billing.activationStrategy === "payment",
      planName:
        company.plan?.id === billing.planId
          ? (company.plan?.name ?? null)
          : null,
      dueAt,
      dueAtText: dueAt === null ? null : formatDate(dueAt, locale),
      invoiceUrl: billing.invoiceUrl,
    };
  } else if (company.scheduledDowngrade !== null) {
    notice = {
      kind: "scheduled_downgrade",
      toPlanName: company.scheduledDowngrade.plan.name,
      fromPlanName: company.plan?.name ?? null,
      at: company.scheduledDowngrade.effectiveAt,
      atText: formatDate(company.scheduledDowngrade.effectiveAt, locale),
    };
  }

  const credits =
    showCredits && catalogPlan !== undefined
      ? derivePlanCredits(catalogPlan.includedCreditGrants, catalogPlan, locale)
      : [];
  const creditRefs = new Map(credits.map((c) => [c.credit.id, c.credit]));
  const autoTopups = showCredits
    ? autoTopupLines(company.creditAutoTopups, creditRefs)
    : [];

  const awaitingActivation =
    notice?.kind === "custom_billing" && notice.awaitingActivation;
  const canChangePlan =
    (catalog?.capabilities.checkout ?? false) && !awaitingActivation;

  return {
    plan:
      company.plan === null
        ? null
        : {
            id: company.plan.id,
            name: company.plan.name,
            description: company.plan.description,
            icon: company.plan.icon === "" ? null : company.plan.icon,
            price,
          },
    addOns: company.addOns.map((addOn) => addOnLine(addOn, locale)),
    usageBased,
    credits,
    autoTopups,
    notice,
    period,
    canChangePlan,
    renewsAt:
      subscription === null || willCancel
        ? null
        : {
            date: subscription.currentPeriodEnd,
            text: formatDate(subscription.currentPeriodEnd, locale),
          },
  };
}
