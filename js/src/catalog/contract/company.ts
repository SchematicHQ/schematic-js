/**
 * The company tier of the proposed contract: one company's current state,
 * served only to a temporary access token. Catalog offerings are NOT
 * duplicated here — `CompanyCatalog` decorates those.
 */

import type { Price } from "./catalog";
import type { AutoTopupAvailability, SubscriptionStatus } from "./enums";

/** A plan or add-on the company holds, with the price it actually pays. */
export interface CompanyPlan {
  id: string;
  /** `null` for a held add-on outside every catalog. PlanManager. */
  catalogId: string | null;
  /** PlanManager. */
  name: string;
  /** PlanManager (showDescription). */
  description: string;
  /** PlanManager. */
  icon: string;
  isAddOn: boolean;
  /** Billed through `CompanyContext.customBilling` rather than a catalog price. PlanManager. */
  isCustom: boolean;
  /**
   * What the company pays: its subscription line item, or the one-time price
   * of a purchased one-time add-on. `null` for free plans and for
   * custom-billed plans with no subscription line. PlanManager.
   */
  price: Price | null;
  /** Per-seat add-ons: units held. PlanManager. */
  quantity: number | null;
}

/** Custom-plan billing terms; drives PlanManager's custom-billing notice. */
export interface CustomBilling {
  id: string;
  planId: string;
  /** Provider vocabulary (`pending` | `paid` | …). PlanManager. */
  status: string;
  activationStrategy: string;
  billingCycleAnchor: Date | null;
  daysUntilDue: number;
  /** Hosted invoice to pay. PlanManager notice link. */
  invoiceUrl: string | null;
  paidAt: Date | null;
  publishedAt: Date | null;
  sendInvoice: boolean;
}

export interface Subscription {
  id: string;
  /** PlanManager notices; UpcomingBill empty state. */
  status: SubscriptionStatus;
  /** PlanManager price line. */
  currency: string;
  /** Provider interval as stored; with `intervalCount` the client derives the period. PlanManager, MeteredFeatures, UpcomingBill. */
  interval: string;
  intervalCount: number;
  /** Recurring total in minor units before discounts. PlanManager. */
  totalAmount: number;
  currentPeriodStart: Date;
  /** PlanManager ("renews on"), UpcomingBill. */
  currentPeriodEnd: Date;
  /** PlanManager trial notice. */
  trialing: boolean;
  /** PlanManager trial notice. */
  trialEnd: Date | null;
  /** Set when the subscription will end; PlanManager cancel notice, UpcomingBill contract end. */
  cancelAt: Date | null;
  cancelAtPeriodEnd: boolean;
}

export interface ScheduledDowngrade {
  /** PlanManager notice. */
  plan: { id: string; name: string };
  /** PlanManager notice. */
  effectiveAt: Date;
  currency: string;
  /** Scheduled recurring minor units, when known. PlanManager notice. */
  amount: number | null;
}

/**
 * Auto top-up configuration for one of the company's credit grants. Not in
 * RFC 0007; PlanManager renders it today from the hydrate credit grants.
 */
export interface CreditAutoTopup {
  creditId: string;
  /** `off` hides the section. PlanManager. */
  availability: AutoTopupAvailability;
  /** Whether the company may change the setting. PlanManager "Edit" CTA. */
  selfService: boolean;
  /** Effective setting after company overrides. PlanManager. */
  enabled: boolean;
  /** Credits remaining that trigger a top-up. PlanManager. */
  thresholdCredits: number | null;
  /** Credits added per top-up. PlanManager. */
  amount: number | null;
}

/** `GET /company` */
export interface CompanyContext {
  id: string;
  name: string;
  /** `null` when the company has no plan. PlanManager. */
  plan: CompanyPlan | null;
  /** Everything held, in or out of any catalog. PlanManager. */
  addOns: CompanyPlan[];
  /** `null` without a billing subscription. PlanManager, MeteredFeatures, UpcomingBill. */
  subscription: Subscription | null;
  /** Newest pending or active custom-plan billing record; `null` when none. PlanManager. */
  customBilling: CustomBilling | null;
  /** PlanManager. */
  scheduledDowngrade: ScheduledDowngrade | null;
  /** Per-credit auto top-up settings for the current plan's grants. PlanManager. */
  creditAutoTopups: CreditAutoTopup[];
}
