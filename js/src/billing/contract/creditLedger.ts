/**
 * `GET /company/credits/ledger`. The wire shapes are generated from the API's
 * spec by scripts/generate-billing-api.sh and re-exported here under their
 * domain names; `CreditLedgerPage` is a client construct built from the
 * response.
 */

import type {
  CompanyCreditLedgerBundleResponseData,
  CompanyCreditLedgerCreditResponseData,
  CompanyCreditLedgerEntryResponseData,
  CompanyCreditLedgerFeatureResponseData,
  CompanyCreditLedgerUserResponseData,
} from "../api/generated/models";

export type {
  CompanyCreditLedgerBundleResponseData,
  CompanyCreditLedgerCreditResponseData,
  CompanyCreditLedgerEntryResponseData,
  CompanyCreditLedgerFeatureResponseData,
  CompanyCreditLedgerUserResponseData,
};
export {
  BillingCreditGrantReason,
  BillingCreditGrantZeroedOutReason,
  CreditLedgerEntryKind,
  CreditUsageReason,
} from "../api/generated/models";

/**
 * One change to a balance, as the server has already folded it:
 *
 * * A draw written against several grants is one entry, and each user's
 *   share of a draw is its own.
 * * `amount` is signed — negative for draws and expiries, positive for
 *   grants and refunded draws.
 * * `kind` is `drawdown`, `grant` or `zero_out`; the reason beside it says
 *   whether a grant is a top-up or a zero-out an expiry.
 */
export type CreditLedgerEntry = CompanyCreditLedgerEntryResponseData;

export interface CreditLedgerPage {
  entries: CreditLedgerEntry[];
  /** Reads the page after this one; absent on the last page. */
  nextCursor?: string;
}

/** Each distinct query is its own row set with its own paging. */
export interface CreditLedgerQuery {
  /** Only these credits, by id. All credits when omitted or empty. */
  credits?: string[];
  /** Grants and expiries alongside draws. Default true. */
  includeGrants?: boolean;
}

export const DEFAULT_CREDIT_LEDGER_QUERY: CreditLedgerQuery = {};

/**
 * Keyed by shape, like the invoice query: `{ includeGrants: true }` and `{}`
 * are one row set, and so are the same credits in another order.
 */
export function normalizeCreditLedgerQuery(
  query: CreditLedgerQuery,
): CreditLedgerQuery {
  const { credits, includeGrants, ...rest } = query;
  const normalized: CreditLedgerQuery = { ...rest };
  if (credits !== undefined && credits.length > 0) {
    normalized.credits = [...new Set(credits)].sort();
  }
  if (includeGrants === false) {
    normalized.includeGrants = false;
  }
  return normalized;
}
