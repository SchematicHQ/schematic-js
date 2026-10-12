/**
 * `GET /company`: the company as the plan elements show it. The wire shapes
 * are generated from the API's spec by scripts/generate-billing-api.sh and
 * re-exported here under their domain names.
 */

import type {
  CompanyContextCustomPlanBillingResponseData,
  CompanyContextPlanResponseData,
  CompanyContextResponseData,
  CompanyContextScheduledDowngradeResponseData,
  CompanyContextSubscriptionResponseData,
} from "../api/generated/models";

export type {
  CompanyContextCustomPlanBillingResponseData,
  CompanyContextPlanResponseData,
  CompanyContextResponseData,
  CompanyContextScheduledDowngradeResponseData,
  CompanyContextSubscriptionResponseData,
};

/**
 * The company. The server has already made the embed's derivations from its
 * hydrated `company`:
 *
 * * `subscription` is absent when the company has none, or several.
 * * `subscription.period` comes from its first recurring product, else its
 *   interval; `subscription.nextBillAt` is the embed's next bill date.
 * * `customPlanBilling` is the newest pending one, with its `dueAt`.
 */
export type Company = CompanyContextResponseData;

/** A plan or add-on the company holds, at the price it is billed. */
export type CompanyPlan = CompanyContextPlanResponseData;

export type CompanySubscription = CompanyContextSubscriptionResponseData;

export type CustomPlanBilling = CompanyContextCustomPlanBillingResponseData;

export type ScheduledDowngrade = CompanyContextScheduledDowngradeResponseData;
