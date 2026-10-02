/**
 * `GET /company`: the session's company as its own users may read it. The
 * wire shape is generated from the API's spec by
 * scripts/generate-billing-api.sh and re-exported here under its domain name.
 */

import type {
  CompanyContextResponseData,
  CompanyContextSubscriptionResponseData,
  CompanyPlanResponseData,
} from "../api/generated/models";

export type {
  CompanyContextResponseData,
  CompanyContextSubscriptionResponseData,
  CompanyPlanResponseData,
};

/**
 * The plan and add-ons the company holds, each with the price it pays and the
 * catalog it is sold in, and its subscription: the currency and period a
 * change has to stay in, and whether it is trialing.
 */
export type Company = CompanyContextResponseData;

export type CompanyPlan = CompanyPlanResponseData;

export type CompanySubscription = CompanyContextSubscriptionResponseData;
