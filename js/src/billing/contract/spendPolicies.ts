/**
 * `/company/credits/spend-policies`. The wire shapes are generated from the
 * API's spec by scripts/generate-billing-api.sh and re-exported here under
 * their domain names. The DataStream client already exports
 * `CreditSpendPolicy` for the policies binding the current user, so these
 * read `SpendPolicy`.
 */

import type {
  CompanySpendPolicyCreditResponseData,
  CompanySpendPolicyResponseData,
  CompanySpendPolicyUserResponseData,
  CreditSpendWindowUnit,
} from "../api/generated/models";

export type {
  CompanySpendPolicyCreditResponseData,
  CompanySpendPolicyResponseData,
  CompanySpendPolicyUserResponseData,
};
export { CreditSpendWindowUnit as SpendWindowUnit } from "../api/generated/models";

/**
 * One cap on a company's spend of a credit:
 *
 * * `scopeType` is `company` for the whole company, `user` for one member,
 *   who is on `user`.
 * * A policy caps either a window (`windowAmount` per `windowUnit`) or a
 *   single draw (`maxPerDraw`), never both.
 * * `consumed`, `headroom` and `resetsAt` are set on window caps only.
 * * `billing_period` windows are company-only.
 */
export type SpendPolicy = CompanySpendPolicyResponseData;

/**
 * A new policy. Leave out `userId` to cap the whole company. Set either
 * `maxPerDraw` or both `windowAmount` and `windowUnit`.
 */
export interface SpendPolicyInput {
  creditId: string;
  maxPerDraw?: number;
  userId?: string;
  windowAmount?: number;
  windowUnit?: CreditSpendWindowUnit;
}

/**
 * What an edit may change. A policy's credit, scope and kind are fixed: a
 * window cap takes no `maxPerDraw`, and a per-draw cap no window.
 */
export interface SpendPolicyChanges {
  maxPerDraw?: number;
  windowAmount?: number;
  windowUnit?: CreditSpendWindowUnit;
}
