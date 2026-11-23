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
  CompanyCreditOverdraftResponseData,
  CompanyCreditUserUsageResponseData,
  CompanyCreditUserUsageRowResponseData,
} from "../api/generated/models";

export type {
  CompanyCreditAutoTopupResponseData,
  CompanyCreditBalanceResponseData,
  CompanyCreditCompositionResponseData,
  CompanyCreditGrantResponseData,
  CompanyCreditOverdraftResponseData,
  CompanyCreditUserUsageResponseData,
  CompanyCreditUserUsageRowResponseData,
};

export { CreditOverdraftLimitSource } from "../api/generated/models";

/**
 * One credit's balance. What the server has already decided, so a consumer
 * never re-derives it:
 *
 * * `grants` are the live ones only, newest first; expired and zeroed-out
 *   grants are gone, so `total` is `used` plus `remaining`.
 * * A credit the plan draws on that the company holds none of is a zero
 *   balance with no grants.
 * * Each grant carries `resetsAt` or `expiresAt`, never both.
 * * `purchasable` — a bundle of it is on offer to the company's plan.
 * * `composition` — how a per-license plan grant adds up per period.
 * * `autoTopup` — auto top-up for a credit the base plan grants, with the
 *   company's own settings applied.
 * * `overdraft` — how far below zero the plan lets this credit go, with the
 *   company's own limit applied. Absent for a credit the plan stops at zero.
 */
export type CreditBalanceEntry = CompanyCreditBalanceResponseData;

export type CreditAutoTopup = CompanyCreditAutoTopupResponseData;

/**
 * One credit's overdraft, for a plan that bills usage past zero at the end of
 * the period. Limits and `debt` are in credits; `postpaidRatePerUnit` prices
 * one of them, in `currency`'s minor unit.
 *
 * * `overdraftLimit` is the limit in force; `limitSource` says whether the
 *   plan's default, the company's own (`companyLimit`) or an admin's cap
 *   (`adminLimit`) set it. An admin cap only ever lowers the limit. `null` is
 *   no limit.
 * * `maxLimit` is the most the company may set: the plan's `planMaxLimit`,
 *   or the admin cap when lower.
 * * `canChangeLimit` — the plan lets the company set its own. A write for a
 *   credit where it is false is refused.
 */
export type CreditOverdraft = CompanyCreditOverdraftResponseData;

/** A change to the company's own overdraft setting for one credit. */
export interface CreditOverdraftUpdate {
  /** The limit, in credits. */
  overdraftLimit: number;
}

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
