/**
 * `GET /company/usage`, and one feature's usage by user beside it. The wire
 * shapes are generated from the API's spec by scripts/generate-billing-api.sh
 * and re-exported here under their domain names.
 */

import type {
  CatalogCreditGrantResponseData,
  CatalogPriceResponseData,
  CatalogPriceTierResponseData,
  CompanyFeatureUsageResponseData,
  CompanyFeatureUserUsageResponseData,
  CompanyUserUsageResponseData,
} from "../api/generated/models";

export type {
  CatalogCreditGrantResponseData,
  CatalogPriceResponseData,
  CatalogPriceTierResponseData,
  CompanyFeatureUsageResponseData,
  CompanyFeatureUserUsageResponseData,
  CompanyUserUsageResponseData,
};

/**
 * One feature the company is entitled to, and its usage. What the server has
 * already decided, so a consumer never re-derives it:
 *
 * * `price` — the one metered price the company is billed at: its billing
 *   period's slot, in the subscription's currency when the feature is priced
 *   in it. Absent when the period has none; another cadence's price is never
 *   substituted.
 * * `currentCost` — what the feature costs at `price`, in its minor units.
 * * `perLicenseCreditGrants` — the plan's credit grants that scale with the
 *   license this feature counts.
 */
export type FeatureUsage = CompanyFeatureUsageResponseData;

/** A metered price, tiers included. */
export type MeteredPrice = CatalogPriceResponseData;

/** A plan credit grant that scales per license. */
export type PerLicenseCreditGrant = CatalogCreditGrantResponseData;

/**
 * One event-based feature's usage by user over its current metric period:
 * a page of `users`, highest usage first; `count` users in all; the period's
 * `total`; and `unattributed` usage from events sent without a user, which is
 * not a user and never on the page.
 */
export type FeatureUserUsage = CompanyFeatureUserUsageResponseData;

export type UserUsage = CompanyUserUsageResponseData;
