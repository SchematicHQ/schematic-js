/**
 * `GET /company/credits/{credit_id}/history` and
 * `GET /company/usage/{feature_id}/history`. The wire shapes are generated from
 * the API's spec by scripts/generate-billing-api.sh and re-exported here under
 * their domain names.
 */

import type {
  CompanyCreditUsageHistoryDayResponseData,
  CompanyCreditUsageHistoryEventResponseData,
  CompanyCreditUsageHistoryFeatureResponseData,
  CompanyCreditUsageHistoryResponseData,
  CompanyFeatureUsageHistoryDayResponseData,
  CompanyFeatureUsageHistoryResponseData,
} from "../api/generated/models";

export type {
  CompanyCreditUsageHistoryDayResponseData,
  CompanyCreditUsageHistoryEventResponseData,
  CompanyCreditUsageHistoryFeatureResponseData,
  CompanyCreditUsageHistoryResponseData,
  CompanyFeatureUsageHistoryDayResponseData,
  CompanyFeatureUsageHistoryResponseData,
};
export { CreditEventType, UsageHistoryPeriod } from "../api/generated/models";

/**
 * One credit's balance by UTC day, oldest first. What the server has already
 * decided:
 *
 * * `billing` spans the credit's live grants, from the earliest one's start
 *   to now; `30d` and `7d` end today.
 * * Each day's `balance` is its closing balance, and `openingBalance` the
 *   balance before the first day.
 * * `events` are the grants and zero-outs inside the window; transfers
 *   between grants are left out, as they leave the balance where it was.
 * * `external` — the ledger lives with the billing provider, and `days` is
 *   empty.
 */
export type CreditUsageHistory = CompanyCreditUsageHistoryResponseData;

export type CreditUsageHistoryDay = CompanyCreditUsageHistoryDayResponseData;

export type CreditUsageHistoryEvent =
  CompanyCreditUsageHistoryEventResponseData;

export type CreditUsageHistoryFeature =
  CompanyCreditUsageHistoryFeatureResponseData;

/**
 * One event-based feature's usage by UTC day, oldest first, through today.
 * For `billing` the window is the feature's current metric period, so
 * `endTime` is when it resets and can be in the future. `periodToDate` is the
 * metric period's running total, which restarts when a period does; `limit`
 * is absent when the company's allocation is unlimited.
 */
export type FeatureUsageHistory = CompanyFeatureUsageHistoryResponseData;

export type FeatureUsageHistoryDay = CompanyFeatureUsageHistoryDayResponseData;
