/**
 * `GET /company/credits`, and one credit's consumption by user beside it.
 * The wire shapes are generated from the API's spec by
 * scripts/generate-billing-api.sh and re-exported here under their domain
 * names. `CreditBalance` is taken by the flag client's balances, so the
 * company's are `CreditBalanceEntry`.
 */

import type {
  CompanyCreditAutoTopupResponseData,
  CompanyCreditBalanceResponseData,
  CompanyCreditCompositionResponseData,
  CompanyCreditGrantResponseData,
  CompanyCreditUserUsageResponseData,
  CompanyCreditUserUsageRowResponseData,
} from "../api/generated/models";

export type {
  CompanyCreditAutoTopupResponseData,
  CompanyCreditBalanceResponseData,
  CompanyCreditCompositionResponseData,
  CompanyCreditGrantResponseData,
  CompanyCreditUserUsageResponseData,
  CompanyCreditUserUsageRowResponseData,
};

/**
 * One credit's balance. What the server has already decided, so a consumer
 * never re-derives it:
 *
 * * `grants` are the live ones only, newest first; expired and zeroed-out
 *   grants are gone, so `total` is `used` plus `remaining`.
 * * A credit the plan draws on that the company holds none of is here as a
 *   zero balance with no grants.
 * * Each grant carries `resetsAt` or `expiresAt`, never both.
 * * `purchasable` — a bundle of it is on offer to the company's plan.
 * * `composition` — how a per-license plan grant adds up per period.
 * * `autoTopup` — how a credit the base plan grants tops itself up, with
 *   the company's own settings applied.
 */
export type CreditBalanceEntry = CompanyCreditBalanceResponseData;

export type CreditAutoTopup = CompanyCreditAutoTopupResponseData;

export type CreditGrant = CompanyCreditGrantResponseData;

export type CreditComposition = CompanyCreditCompositionResponseData;

/**
 * One credit's consumption by user over the span of its live grants: a page
 * of `users`, heaviest first; `count` users in all; the span's `total`; and
 * `unattributed` consumption from events sent without a user. Empty for a
 * credit the company holds no live grant of.
 */
export type CreditUserUsage = CompanyCreditUserUsageResponseData;

export type CreditUserUsageRow = CompanyCreditUserUsageRowResponseData;
