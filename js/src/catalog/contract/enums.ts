/**
 * Enumerations of the proposed catalog + company contract, named for the
 * domain rather than for the API's Go enum types. The contract diff
 * (docs/contract-diff.md) maps each one to its API counterpart.
 *
 * Every value is the wire string the API emits today, so a generated client
 * can replace these aliases without touching an element.
 */

/** Provider billing interval as stored; see `derivePeriod` for the display period. */
export type PriceInterval = "day" | "week" | "month" | "year" | "one-time";

/** Recurring cadences a plan is sold at. Never contains a one-time entry. */
export type PriceCadence = "monthly" | "quarterly" | "yearly";

export type PlanChargeType = "free" | "one_time" | "recurring";

export type PriceScheme = "per_unit" | "tiered";

export type TiersMode = "graduated" | "volume";

export type FeatureKind = "boolean" | "event" | "license" | "trait";

export type EntitlementValueKind =
  "boolean" | "credit" | "numeric" | "trait" | "unlimited";

export type PriceBehavior =
  "credit_burndown" | "overage" | "pay_as_you_go" | "pay_in_advance" | "tier";

export type EntitlementMetricPeriod =
  | "all_time"
  | "billing"
  | "current_day"
  | "current_month"
  | "current_week"
  | "current_year";

export type EntitlementMonthReset = "billing_cycle" | "first_of_month";

/** Where a company's entitlement comes from. */
export type EntitlementSource = "company" | "plan";

export type PlanInvalidReason =
  "downgrade_not_permitted" | "feature_usage_exceeded";

export type CreditGrantScaling = "fixed" | "per_license";

export type CreditResetCadence =
  "daily" | "monthly" | "quarterly" | "weekly" | "yearly";

export type CreditGrantReason =
  | "adjustment"
  | "billing_credit_auto_topup"
  | "free"
  | "plan"
  | "purchased"
  | "rollover";

export type CreditExpiryType =
  | "duration"
  | "end_of_billing_period"
  | "end_of_next_billing_period"
  | "end_of_trial"
  | "no_expiry";

export type CreditExpiryUnit = "billing_periods" | "days";

export type AutoTopupAvailability = "automatic" | "off" | "user_controlled";

/** Provider subscription status vocabulary. */
export type SubscriptionStatus =
  | "active"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "past_due"
  | "paused"
  | "trialing"
  | "unpaid";

export type InvoiceStatus =
  "draft" | "open" | "paid" | "uncollectible" | "void";

export type DiscountDuration = "forever" | "once" | "repeating";
